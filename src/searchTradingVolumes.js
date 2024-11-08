/**
 * SilverFir Bot 🌲 - [Node.js Release]
 * 
 * Инструмент поиска акций с наибольшим оборотом за последние три месяца 
 * =====================================================================
 * 
 * @version 1.0.0
 * @license Apache-2.0
 * @author Михаил Шардин [Mikhail Shardin]
 * @site https://shardin.name/
 * @repository https://github.com/empenoso/SilverFir-TradingBot
 * 
 * Last updated: 29.09.2024
 */


const moment = require('moment');

const secrets = require('../config/secrets'); // Ключи доступа и идентификаторы
const logger = require('./services/logService'); // Логирование в файл и консоль
const TinkoffClient = require('./grpc/tinkoffClient'); // Модуль для взаимодействия с API Tinkoff Invest

const API_TOKEN = secrets.TbankSandboxMode;
const tinkoffClient = new TinkoffClient(API_TOKEN);

// Шаг 1: Фильтрация акций из REAL_EXCHANGE_MOEX и их регистрация 
async function getFilteredStocks() {
    try {
        // Запрос акций через InstrumentsService/Shares
        const sharesPayload = {
            instrumentStatus: 'INSTRUMENT_STATUS_BASE',
            instrumentExchange: 'INSTRUMENT_EXCHANGE_UNSPECIFIED'
        };

        const response = await tinkoffClient.callApi('InstrumentsService/Shares', sharesPayload);

        // // Выводим ответ от сервера в консоль, чтобы лучше понять структуру данных        
        // logger.info(`Ответ от API Т‑Банк: ${JSON.stringify(response, null, 2)}`);

        // Фильтрация только для бумаг на REAL_EXCHANGE_MOEX
        const filteredStocks = response.instruments.filter(stock => stock.realExchange === 'REAL_EXCHANGE_MOEX');

        // Логирование отфильтрованных значений
        const stockData = filteredStocks.map(stock => ({
            figi: stock.figi,
            ticker: stock.ticker,
            isin: stock.isin,
            name: stock.name,
            uid: stock.uid
        }));

        logger.info(`Отфильтрованных акций ${stockData.length} штук:\n ${JSON.stringify(stockData)}`);
        return stockData;

    } catch (error) {
        logger.error(`Ошибка при получении акций: ${error.message}`);
        throw error;
    }
}

// Шаг 2: Получение свечей для каждой акции и суммирование объема за последние три месяца
async function getCandlesForStock(stock) {
    try {
        const today = moment().format('YYYY-MM-DD');
        const threeMonthsAgo = moment().subtract(3, 'months').format('YYYY-MM-DD');

        // // Логирование диапазона дат
        // logger.info(`Получение свечей для за период: ${threeMonthsAgo} - ${today}`);

        const candles = await tinkoffClient.getCandles(stock.figi, 'CANDLE_INTERVAL_DAY', threeMonthsAgo, today);

        // logger.info(`Данные первых трёх свечей ${stock.name}:\n ${JSON.stringify(candles.slice(0, 3), null, 2)}`);
        // logger.info(`Данные последних трёх свечей ${stock.name}:\n ${JSON.stringify(candles.slice( (candles.length-3), candles.length), null, 2)}`);

        // Суммируем объем за три месяца
        const totalVolume = candles.reduce((sum, candle) => sum + parseInt(candle.volume), 0);

        return {
            ticker: stock.ticker,
            figi: stock.figi,
            uid: stock.uid,
            totalVolume
        };

    } catch (error) {
        logger.error(`Ошибка при получении свечей для FIGI: ${stock.figi}, ошибка: ${error.message}`);
        throw error;
    }
}

// Шаг 3: Основная функция для обработки volume и отображения 15 лучших результатов по объему
async function findTopStocksByTurnover() {
    try {
        // Получаем отфильтрованные акции
        const stocks = await getFilteredStocks();

        // Получаем свечи и суммируем объемы для каждой акции
        const stockVolumes = await Promise.all(stocks.map(stock => getCandlesForStock(stock)));

        // Сортируем акции по объему и выбираем топ-15
        const topStocks = stockVolumes
            .sort((a, b) => b.totalVolume - a.totalVolume)
            .slice(0, 15);

        // Создаем массивы тикеров и FIGI
        const securitiesToMonitorTikerArray = topStocks.map(stock => stock.ticker);
        const securitiesToMonitorFigiArray = topStocks.map(stock => stock.figi);
        const toPythonScript = topStocks.map(stock => ({
            ticker: stock.ticker,
            uid: stock.uid
        }));

        // Логируем топ-15 акций и их объем
        logger.info(`Топ 15 акций по объему за последние три месяца: ${JSON.stringify(topStocks, null, 2)}`);

        // Логируем тикеры и FIGI
        logger.info(`\n\nВставка в config.js:\n`);
        logger.info(`\nsecuritiesToMonitorTikerArray: ${JSON.stringify(securitiesToMonitorTikerArray)}`);
        logger.info(`\nsecuritiesToMonitorFigiArray: ${JSON.stringify(securitiesToMonitorFigiArray)}`);

        logger.info(`\n\nДля использования в скрипте download_md.sh в одну колонку:\n${securitiesToMonitorFigiArray.join('\n')}`);

        logger.info(`\n\nДля использования в Python скрипте бэктестинга:\n${JSON.stringify(toPythonScript, null, 2)}`);                

        // Возвращаем итоговые данные
        return {
            securitiesToMonitorTikerArray,
            securitiesToMonitorFigiArray,
            topStocks
        };

    } catch (error) {
        logger.error(`Ошибка в поиске акций с наибольшим оборотом: ${error.message}`);
    }
}


// Запуск функции
findTopStocksByTurnover();