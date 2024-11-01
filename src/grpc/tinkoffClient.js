/**
 * SilverFir Bot 🌲 - [Node.js Release]
 * 
 * Специальный модуль для взаимодействия с API Tinkoff Invest
 * ===========================================================
 * 
 * Документация по T-Invest API: https://russianinvestments.github.io/investAPI/swagger-ui/
 * 
 * @version 1.0.0
 * @license Apache-2.0
 * @author Михаил Шардин [Mikhail Shardin]
 * @site https://shardin.name/
 * @repository https://github.com/empenoso?tab=repositories
 * 
 * Last updated: 24.09.2024
 */


const secrets = require('../../config/secrets'); // Ключи доступа и идентификаторы
const logger = require('../services/logService'); // Логирование в файл и консоль
const logFunctionName = require('../services/logFunctionName'); // Получение имени функции

const moment = require('moment'); // Использую moment.js для обработки форматирования дат
const axios = require('axios');

class TinkoffClient {
    constructor(apiToken) {
        this.apiToken = apiToken;
        // сервис песочницы
        this.apiUrl = 'https://sandbox-invest-public-api.tinkoff.ru:443/rest/tinkoff.public.invest.api.contract.v1.';
        // продовый сервис
        // this.apiUrl = 'https://invest-public-api.tinkoff.ru:443/rest/tinkoff.public.invest.api.contract.v1.';
        // Различия: https://russianinvestments.github.io/investAPI/url_difference/

        this.headers = {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
        };
    }


    // Универсальный метод вызова конечных точек API Тинькофф
    async callApi(endpoint, payload = {}) {
        try {
            const response = await axios.post(`${this.apiUrl}${endpoint}`, payload, {
                headers: this.headers,
            });
            // Выводим ответ от сервера в консоль, чтобы лучше понять структуру данных
            // logger.info(`Ответ от API Т‑Банк:\n ${JSON.stringify(response.data, null, 2)}`);
            return response.data;
        } catch (error) {
            logger.error(`Ошибка вызова ${endpoint}:`, error.response ? error.response.data : error.message);
        }
    }


    // Получение свечей по инструменту
    // https://russianinvestments.github.io/investAPI/marketdata/#getcandlesrequest
    async getCandles(ticker, interval) {
        try {
            // Получаем текущую дату и время
            const now = new Date().toISOString();
            // Дата начала в зависимости от интервала
            const from = calculateFromDate(interval);

            // Запрос к API для получения свечей
            const response = await axios.post(`${this.apiUrl}MarketDataService/GetCandles`, {
                figi: ticker, // Идентификатор инструмента
                from: from, // Время начала (в зависимости от интервала)
                to: now, // Время окончания (текущая дата и время)
                interval: interval, // Интервал свечей, например: CANDLE_INTERVAL_5_MIN, CANDLE_INTERVAL_HOUR, CANDLE_INTERVAL_DAY
                candleSourceType: 'CANDLE_SOURCE_UNSPECIFIED',
                limit: 1000 // Максимум свечей (можно настроить)
            }, {
                headers: this.headers, // Заголовки для авторизации
            });
            // // Выводим ответ для анализа структуры данных
            // logger.info(`Ответ от API Т‑Банк:\n ${JSON.stringify(response.data, null, 2)}`);

            // Проверяем, есть ли данные о свечах
            if (response.data.candles && response.data.candles.length > 0) {
                return response.data.candles; // Возвращаем свечи
            } else {
                throw new Error('Нет данных о свечах для данного тикера.');
            }
        } catch (error) {
            logger.error('Ошибка при получении свечей:', error.response ? error.response.data : error.message);
        }
    }


    // Получение понятного имени инструмента
    // ПЕРЕДЕЛАТЬ InstrumentsService/GetInstrumentBy Получить основную информацию об инструменте.
    async getName(ticker) {
        try {
            const response = await axios.post(`${this.apiUrl}InstrumentsService/FindInstrument`, {
                "query": ticker,
                "instrumentKind": "INSTRUMENT_TYPE_SHARE"
            }, {
                headers: this.headers, // Указываем заголовки, которые должны быть переданы в качестве третьего аргумента
            });
            // // Выводим ответ от сервера в консоль, чтобы лучше понять структуру данных
            // logger.info(`Ответ от API Т‑Банк:\n ${JSON.stringify(response.data, null, 2)}`);
            if (response.data.instruments && response.data.instruments.length > 0) {
                const instrument = response.data.instruments[0];
                const name = instrument.name;
                const ticker = instrument.ticker;
                const uid = instrument.uid;
                return {
                    nameCombination: `${name} (${ticker})`, // Возвращаем комбинацию имени и тикера
                    uid: uid,
                    ticker: ticker
                };
            } else {
                throw new Error('Инструмент не найден.');
            }
        } catch (error) {
            logger.error(`Ошибка при получении имени инструмента: ${error.response ? error.response.data : error.message}`);
        }
    }


    // Функция для отправки рыночного ордера
    async placeMarketOrder(figi, quantity, direction) {
        const instrument = await this.getName(figi);
        const instrumentUid = instrument.uid;
        const accountId = secrets.AccountID;

        try {
            const orderParams = {
                figi: figi,
                quantity: quantity,
                direction: direction, // "ORDER_DIRECTION_BUY" или "ORDER_DIRECTION_SELL"
                accountId: accountId,
                orderType: "ORDER_TYPE_MARKET",
                instrumentId: instrumentUid
            };

            // Отправляем в конечную точку OrdersService/PostOrder
            const response = await axios.post(`${this.apiUrl}OrdersService/PostOrder`, orderParams, {
                headers: this.headers,
            });

            logger.warn(`Операция ${direction === "ORDER_DIRECTION_BUY" ? "покупки" : "продажи"} выполнена успешно для ${instrument.nameCombination} (${figi}).`);
            logger.info(`Детали операции:\n ${JSON.stringify(response.data, null, 2)}`);

            // Выводим в консоль нужную информацию
            logger.info(`Идентификатор ${direction === "ORDER_DIRECTION_BUY" ? "покупки" : "продажи"}: ${response.data.orderId}.`);
            logger.info(`Общая стоимость сделки: ${formatPrice(response.data.initialOrderPrice.units, response.data.initialOrderPrice.nano)} руб.`);
            logger.info(`Цена за 1 шт. ${instrument.nameCombination}: ${formatPrice(response.data.executedOrderPrice.units, response.data.executedOrderPrice.nano)} руб.`);
            logger.info(`Комиссия за сделку: ${formatPrice(response.data.initialCommission.units, response.data.initialCommission.nano)} руб.`);

            // Возвращаем цену покупки
            return formatPrice(response.data.executedOrderPrice.units, response.data.executedOrderPrice.nano); 
        } catch (error) {
            logger.error(`Ошибка при размещении ордера ${figi}: ${error.response ? JSON.stringify(error.response.data, null, 2) : error.message}`);
            return 0
        }
    }


    // Получить портфель по счёту
    async getPortfolio() {
        try {
            const payload = {
                accountId: secrets.AccountID,
                currency: "RUB" // Валюта портфеля (например, RUB)
            };

            // Вызов API с использованием универсального метода
            const response = await this.callApi('OperationsService/GetPortfolio', payload, {
                headers: this.headers, // Указываем заголовки, которые должны быть переданы в качестве третьего аргумента
            });

            // Возвращаем данные из ответа API
            return response;
        } catch (error) {
            logger.error(`Ошибка загрузки портфолио: ${error.response ? error.response.data : error.message}`);
        }
    }


}
module.exports = TinkoffClient;

// Выводим цену когда надо учесть что units и nano это целое и дробные части одного числа
function formatPrice(units, nano) {
    return parseFloat(`${units}.${nano}`)
}

// Определение периода в зависимости от интервала свечей для getCandles(ticker, interval) 
function calculateFromDate(interval) {
    const now = new Date();

    switch (interval) {
        case "CANDLE_INTERVAL_5_MIN":
            return new Date(now.setDate(now.getDate() - 1)).toISOString(); // Отнимаем 1 день для интервала 5 минут
        case "CANDLE_INTERVAL_HOUR":
            return new Date(now.setDate(now.getDate() - 7)).toISOString(); // Отнимаем 1 неделю для интервала час
        case "CANDLE_INTERVAL_DAY":
            return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString(); // Отнимаем 1 год для интервала день
        default:
            throw new Error('Неверный интервал свечей');
    }
}