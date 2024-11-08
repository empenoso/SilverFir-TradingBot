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
 * @repository https://github.com/empenoso/SilverFir-TradingBot
 * 
 * Last updated: 03.11.2024
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
            logger.error(`Ошибка универсального метода вызова ${endpoint}:: ${error.response ? JSON.stringify(error.response.data, null, 2) : error.message}`);
        }
    }


    // Получение последней котировки по определенному инструменту
    async getQuote(ticker) {
        try {
            const response = await axios.post(`${this.apiUrl}MarketDataService/GetLastPrices`, {
                figi: [ticker], // Правильный формат для массива figi
            }, {
                headers: this.headers, // // Указываем заголовки, которые должны быть переданы в качестве третьего аргумента
            });
            // Выводим ответ от сервера в консоль, чтобы лучше понять структуру данных
            // logger.info(`Ответ от API Т‑Банк:\n ${JSON.stringify(response.data, null, 2)}`);
            if (response.data.lastPrices && response.data.lastPrices.length > 0) {
                const priceData = response.data.lastPrices[0].price;
                const value = parseFloat(`${priceData.units}.${priceData.nano}`);
                return value;
            } else {
                throw new Error('Нет данных о цене для данного тикера.');
            }
        } catch (error) {
            logger.error(`Ошибка при получении котировки: ${error.response ? JSON.stringify(error.response.data, null, 2) : error.message}`);
        }
    }

    // Получение торгового лота - это определенное количество акций, которые можно купить или продать в рамках одной сделки
    async getLot(figi) {
        try {
            const response = await axios.post(`${this.apiUrl}InstrumentsService/GetInstrumentBy`, {
                idType: "INSTRUMENT_ID_TYPE_FIGI",
                id: figi
            }, {
                headers: this.headers,
            });

            // Проверка, что данные вернулись корректно
            if (response.data && response.data.instrument && response.data.instrument.lot) {
                const lotSize = response.data.instrument.lot; // Получаем размер лота
                return lotSize;
            } else {
                throw new Error('Информация о торговом лоте в ответе отсутствует.');
            }
        } catch (error) {
            logger.error(`Ошибка получения размера лота: ${error.response ? error.response.data : error.message}`);
            return 0; // Возвращаем 0 в случае ошибки
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
            logger.error(`Ошибка при получении свечей: ${error.response ? JSON.stringify(error.response.data, null, 2) : error.message}`);
        }
    }


    // Получение технических индикаторов по инструменту
    // https://russianinvestments.github.io/investAPI/get_tech_indicators/
    async getTechIndicators(instrumentUid, indicatorType, interval, typeOfPrice, length) {
        try {
            // Получаем текущую дату и время
            const now = new Date().toISOString();
            // Дата начала в зависимости от интервала индикатора
            const from = calculateIndicatorFromDate(interval);

            // Запрос к API для получения технических индикаторов
            const response = await axios.post(`${this.apiUrl}MarketDataService/GetTechAnalysis`, {
                indicatorType: indicatorType || "INDICATOR_TYPE_UNSPECIFIED", // Тип индикатора:
                // Simple Moving Average — простое скользящее среднее: INDICATOR_TYPE_SMA
                // Exponential Moving Average — EMA, экспоненциальная скользящая средняя: INDICATOR_TYPE_EMA
                // Bollinger Bands — линия Боллинжера: INDICATOR_TYPE_BB
                // Relative Strength Index — индекс относительной силы: INDICATOR_TYPE_RSI
                instrumentUid: instrumentUid, // Уникальный ID инструмента
                from: from, // Время начала (в зависимости от интервала)
                to: now, // Время окончания (текущая дата и время)
                interval: interval || "INDICATOR_INTERVAL_UNSPECIFIED",
                // Интервал, например: 
                // INDICATOR_INTERVAL_FIVE_MINUTES
                // INDICATOR_INTERVAL_ONE_HOUR
                // INDICATOR_INTERVAL_ONE_DAY
                typeOfPrice: typeOfPrice || "TYPE_OF_PRICE_UNSPECIFIED", // Тип цены (например, закрытие, открытие)
                length: length, // Длина индикатора для SMA — простая скользящая средняя или EMA — экспоненциальная (скользящая) средняя                
                // deviation: {
                //     deviationMultiplier: {
                //         nano: 0,
                //         units: 2
                //     } // Множитель отклонения для Bollinger Bands INDICATOR_TYPE_BB
                // },
                // smoothing: {
                //     fastLength: 12, // Быстрая длина для MACD индикатора «Схождение-расхождение скользящих средних» INDICATOR_TYPE_MACD
                //     slowLength: 26, // Медленная длина для MACD индикатора «Схождение-расхождение скользящих средних» INDICATOR_TYPE_MACD
                //     signalSmoothing: 9 // Сглаживание MACD индикатора «Схождение-расхождение скользящих средних» INDICATOR_TYPE_MACD
                // }
            }, {
                headers: this.headers, // Заголовки для авторизации
            });

            // // Выводим ответ для анализа структуры данных
            // logger.info(`Ответ от API Т‑Банк:\n ${JSON.stringify(response.data, null, 2)}`);
            // response.data.technicalIndicators.forEach((indicator) => {                
            //     logger.info(`Дата: ${indicator.timestamp}, Значение: ${indicator.signal.units}.${indicator.signal.nano}`);
            // });

            // Проверяем, есть ли данные о технических индикаторах
            if (response.data.technicalIndicators && response.data.technicalIndicators.length > 0) {
                return response.data.technicalIndicators; // Возвращаем индикаторы
            } else {
                throw new Error('Нет данных о технических индикаторах для данного инструмента.');
            }
        } catch (error) {
            logger.error(`Ошибка при получении технических индикаторов: ${error.response ? JSON.stringify(error.response.data, null, 2) : error.message}`);
            return null; // Возвращаем null в случае ошибки
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
            logger.error(`Ошибка при получении имени инструмента: ${error.response ? JSON.stringify(error.response.data, null, 2) : error.message}`);
        }
    }


    // Получение времени работы биржи
    async getExchangeOpen() {
        try {
            const response = await axios.post(`${this.apiUrl}InstrumentsService/TradingSchedules`, {}, {
                headers: this.headers,
            });
            // // Выводим ответ от сервера в консоль, чтобы лучше понять структуру данных
            // logger.info(`Ответ от API Т‑Банк:\n ${JSON.stringify(response.data, null, 2)}`);

            // Есть ли вообще ответ?
            if (!response.data) {
                logger.info('Нет ответа о режиме торгов.');
                return false; // Возвращаем false, если нет ответа о режиме торгов
            }

            // Ищем конкретный режим MOEX_PLUS_WEEKEND
            const exchange = response.data.exchanges.find(e => e.exchange === "MOEX_PLUS_WEEKEND");
            if (!exchange) {
                logger.error('MOEX_PLUS_WEEKEND не найдено в ответе.');
                return false; // Возвращаем false, если биржа не найдена
            }
            // Проверяем, что сегодня торговый день
            const today = exchange.days.find(day => day.isTradingDay);
            if (!today) {
                logger.info('Сегодня не торговый день.');
                return false; // Возвращаем false, если не торговый день
            }
            // Получаем текущее время в формате ISO для сравнения
            const currentTime = new Date().toISOString();
            const regularSessions = today.intervals.filter(session =>
                session.type === "regular_trading_session" || session.type === "regular_trading_session_evening"
            );
            // Перебираем торговые сессии
            for (const session of regularSessions) {
                const {
                    startTs,
                    endTs
                } = session.interval;
                if (currentTime >= startTs && currentTime <= endTs) {
                    logger.info(`Биржа открыта. Сейчас идет сессия: ${session.type}.`);
                    return true; // Биржа открыта
                }
            }
            logger.info('Биржа закрыта.');
            return false; // Биржа закрыта
        } catch (error) {
            logger.error(`Ошибка при получении времени работы биржи: ${error.response ? JSON.stringify(error.response.data, null, 2) : error.message}`);
            return false; // Возвращаем false в случае ошибки
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
            logger.error(`Ошибка загрузки портфолио: ${error.response ? JSON.stringify(error.response.data, null, 2) : error.message}`);
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

// Определение периода в зависимости от интервала индикатора getTechIndicators(instrumentUid, indicatorType, interval, typeOfPrice)
function calculateIndicatorFromDate(interval) {
    const now = new Date();

    switch (interval) {
        case "INDICATOR_INTERVAL_FIVE_MINUTES":
            return new Date(now.setDate(now.getDate() - 1)).toISOString(); // Отнимаем 1 день для интервала 5 минут
        case "INDICATOR_INTERVAL_ONE_HOUR":
            return new Date(now.setDate(now.getDate() - 7)).toISOString(); // Отнимаем 1 неделю для интервала час
        case "INDICATOR_INTERVAL_ONE_DAY":
            return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString(); // Отнимаем 1 год для интервала день
        default:
            throw new Error('Неверный интервал индикатора');
    }
}