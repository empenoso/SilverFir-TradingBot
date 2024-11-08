/**
 * SilverFir Bot 🌲 - [Node.js Release]
 * 
 * Все инструменты, которые используются в этом Торговом роботе SilverFir Bot 🌲
 * ============================================================================
 * 
 * Документация по T-Invest API: https://russianinvestments.github.io/investAPI/
 * 
 * @version 1.0.0
 * @license Apache-2.0
 * @author Михаил Шардин [Mikhail Shardin]
 * @site https://shardin.name/
 * @repository https://github.com/empenoso/SilverFir-TradingBot
 * 
 * Last updated: 03.11.2024
 */


// Импорт необходимых модулей
const secrets = require('../config/secrets'); // Ключи доступа и идентификаторы
const config = require('../config/config'); // Параметры

const logger = require('./services/logService'); // Логирование в файл и консоль
const logFunctionName = require('./services/logFunctionName'); // Получение имени функции

const TinkoffClient = require('./grpc/tinkoffClient'); // модуль для взаимодействия с API Tinkoff Invest
const API_TOKEN = secrets.TbankSandboxMode;
const tinkoffClient = new TinkoffClient(API_TOKEN);

async function test() {
    logger.info(`Запуск функции ${JSON.stringify(logFunctionName())}\n`);

    // // Получить основную информацию об инструменте InstrumentsService/GetInstrumentBy
    // const testPayload = {
    //     idType: "INSTRUMENT_ID_TYPE_FIGI", // Тип идентификатора INSTRUMENT_ID_TYPE_FIGI / INSTRUMENT_ID_TYPE_UID / INSTRUMENT_ID_TYPE_TICKER
    //     id: "BBG004730N88" // Идентификатор инструмента
    // };
    // const response = await tinkoffClient.callApi('InstrumentsService/GetInstrumentBy', testPayload);
    // logger.info(`InstrumentsService/GetForecastBy: ${JSON.stringify(response, null, 2)}`); // Отображение ответа от API

    // // Получить список акций InstrumentsService/Shares 
    // const testPayload = {
    //     "instrumentStatus": "INSTRUMENT_STATUS_BASE", // https://russianinvestments.github.io/investAPI/instruments/#instrumentsrequest
    //     "instrumentExchange": "INSTRUMENT_EXCHANGE_UNSPECIFIED"
    // };
    // const response = await tinkoffClient.callApi('InstrumentsService/Shares', testPayload);
    // // Отображение ответа от API
    // logger.info(`Ответ: ${JSON.stringify(response, null, 2)}`); // выводится только 3 первых значения .slice(0, 3)

}

async function instruments() {
    logger.info(`Запуск функции ${JSON.stringify(logFunctionName())}\n`);

    // // Получение времени работы биржи
    // const response = await tinkoffClient.callApi('InstrumentsService/TradingSchedules', {});
    // logger.info(`Получение времени работы биржи: ${JSON.stringify(response, null, 2)}`);
    // await tinkoffClient.getExchangeOpen();

    // // Найти всю информацию об акциях в списке файла config
    // for (const stock of config.securitiesToMonitorTikerArray) { // securitiesToMonitorFigiArray или securitiesToMonitorTikerArray
    //     const securitiesToMonitorTikerArrayPayload = {
    //         "query": stock,
    //         "instrumentKind": "INSTRUMENT_TYPE_SHARE"
    //     };
    //     try {
    //         const FindInstrument = await tinkoffClient.callApi('InstrumentsService/FindInstrument', securitiesToMonitorTikerArrayPayload);
    //         logger.info(`Ищем тикер ${stock}:\n${JSON.stringify(FindInstrument, null, 2)}\n\n`);
    //     } catch (error) {
    //         logger.error(`Ошибка ${stock}:`, error.message);
    //     }
    // }

    // // Получить последнюю цену для акций из списка в файле config
    // for (const stock of config.securitiesToMonitorFigiArray) {
    //     try {
    //         const quote = await tinkoffClient.getQuote(stock);
    //         const name = await tinkoffClient.getName(stock);
    //         logger.info(`Цена акции ${name.nameCombination} [${stock}]: ${quote} руб.`);
    //     } catch (error) {
    //         logger.error(`Ошибка ${stock}:`, error.message);
    //     }
    // }

    // // Получение торговых лотов - это определенное количество акций, которые можно купить или продать в рамках одной сделки
    // for (const stock of config.securitiesToMonitorFigiArray) {
    //     try {
    //         const quote = await tinkoffClient.getLot(stock);
    //         const name = await tinkoffClient.getName(stock);
    //         logger.info(`Торговый лот акции ${name.nameCombination} [${stock}] = ${quote} шт.`);
    //     } catch (error) {
    //         logger.error(`Ошибка ${stock}:`, error.message);
    //     }
    // }

    // Получение понятного имени инструмента
    for (const stock of config.securitiesToMonitorFigiArray) {
        try {
            const name = await tinkoffClient.getName(stock);
            const nameUid = name.uid;
            logger.info(`${name.nameCombination} это ${stock} или ${nameUid}.`);
        } catch (error) {
            logger.error(`Ошибка ${stock}:`, error.message);
        }
    }

    // // Тест корректности размера лотов:
    // const figi = 'BBG004730N88'; // Пример ФИГИ
    // const price = await tinkoffClient.getQuote(figi);
    // const quantity = await config.getPurchaseQuantity(price, figi);
    // logger.info(`Тест количества лотов ${figi} для покупки: ${quantity}`);

    // // Получение свечей по инструменту
    // for (const stock of config.securitiesToMonitorFigiArray) {
    //     try {
    //         const name = await tinkoffClient.getName(stock);
    //         const candles5Min = await tinkoffClient.getCandles(stock, "CANDLE_INTERVAL_5_MIN");
    //         logger.info(`5-минутные свечи для ${name.nameCombination}: ${JSON.stringify(candles5Min.slice(0, 3), null, 2)}`); // выводится только 3 первых значения
    //         const candlesHour = await tinkoffClient.getCandles(stock, "CANDLE_INTERVAL_HOUR");
    //         logger.info(`Часовые свечи для ${name.nameCombination}: ${JSON.stringify(candlesHour.slice(0, 3), null, 2)}`); // выводится только 3 первых значения
    //         const candlesDay = await tinkoffClient.getCandles(stock, "CANDLE_INTERVAL_DAY");
    //         logger.info(`Дневные свечи для ${name.nameCombination}: ${JSON.stringify(candlesDay.slice(0, 3), null, 2)}`); // выводится только 3 первых значения
    //     } catch (error) {
    //         logger.error(`Ошибка ${stock}:`, error.message);
    //     }
    // }

    // // Получение технических индикаторов по инструменту
    // for (const stock of config.securitiesToMonitorFigiArray) {
    //     try {
    //         const instrument = await tinkoffClient.getName(stock);
    //         const instrumentUid = instrument.uid;
    //         const indicatorType = "INDICATOR_TYPE_SMA"; // Пример типа индикатора (SMA, RSI, MACD и т.д.)
    //         const interval = "INDICATOR_INTERVAL_FIVE_MINUTES"; // Пример интервала (5 минут, час, день) INDICATOR_INTERVAL_ONE_HOUR
    //         const typeOfPrice = "TYPE_OF_PRICE_CLOSE"; // Тип цены (например, закрытие)
    //         const indicators = await tinkoffClient.getTechIndicators(instrumentUid, indicatorType, interval, typeOfPrice);
    //         logger.info(`Индикатор ${indicatorType} для ${instrument.nameCombination}: ${JSON.stringify(indicators.slice(0, 3), null, 2)}`); // выводится только 3 первых значения
    //     } catch (error) {
    //         logger.error(`Ошибка ${stock}: ${error.message}`);
    //     }
    // }

    // // Создание графиков пересечения свечей и индикатора для акций из списка в файле config
    // for (const stock of config.securitiesToMonitorFigiArray) {
    //     try {
    //         const charts = chart.generateCandlestickChart(stock);
    //     } catch (error) {
    //         logger.error(`Ошибка ${stock}:`, error.message);
    //     }
    // }

    // // Функция для отправки рыночного ордера
    // tinkoffClient.placeMarketOrder('BBG004730N88', 1, 'ORDER_DIRECTION_BUY'); // Купить акцию
    // tinkoffClient.placeMarketOrder('BBG004730N88', 1, 'ORDER_DIRECTION_SELL'); // Продать акцию

    // // Получить все открытые позиции счёта 
    // const GetSandboxPositions = await tinkoffClient.getPortfolio();
    // logger.info(`Все открытые позиции счёта ${secrets.AccountID}:\n ${JSON.stringify(GetSandboxPositions, null, '\t')}\n\n`);

    // // Расчёт годовой доходности от Торгового робота
    // const SilverFirBotYield = await yieldCalculator.calculateAnnualYield();
    // logger.info(`Годовая доходность от Торгового робота SilverFir Bot: ${SilverFirBotYield}%.`);

    // // Получить прогнозов инвестдомов по инструменту InstrumentsService/GetForecastBy
    // const ForecastPayload = {
    //     "instrumentId": "1c69e020-f3b1-455c-affa-45f8b8049234" // У Аэрофлот (AFLT), BBG004S683W7 [1c69e020-f3b1-455c-affa-45f8b8049234] нет данных аналитиков.
    // };
    // const response = await tinkoffClient.callApi('InstrumentsService/GetForecastBy', ForecastPayload);    
    // logger.info(`InstrumentsService/GetForecastBy: ${JSON.stringify(response, null, 2)}`); // Отображение ответа от API
}


// ======================================================================================
// ============      Запуск функций   ===================================================
// ======================================================================================

test().catch(logger.error);
instruments().catch(err => logger.error(err));