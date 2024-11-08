/**
 * SilverFir Bot 🌲 - [Node.js Release]
 * 
 * Песочница Торгового робота SilverFir Bot 🌲- работа с виртуальным торговым счётом
 * =================================================================================
 * 
 * Документация по T-Invest API: https://russianinvestments.github.io/investAPI/
 * 
 * @version 1.0.0
 * @license Apache-2.0
 * @author Михаил Шардин [Mikhail Shardin]
 * @site https://shardin.name/
 * @repository https://github.com/empenoso/SilverFir-TradingBot
 * 
 * Last updated: 26.09.2024
 */


// Импорт необходимых модулей
const secrets = require('../config/secrets'); // Ключи доступа и идентификаторы

const logger = require('./services/logService'); // Логирование в файл и консоль
const logFunctionName = require('./services/logFunctionName'); // Получение имени функции

const TinkoffClient = require('./grpc/tinkoffClient'); // модуль для взаимодействия с API Tinkoff Invest
const API_TOKEN = secrets.TbankSandboxMode;
const tinkoffClient = new TinkoffClient(API_TOKEN);


async function sandboxAccount() {
    // https://tinkoff.github.io/investAPI/swagger-ui/#/SandboxService/SandboxService_GetSandboxAccounts
    logger.info(`Запуск функции ${JSON.stringify(logFunctionName())}\n`);

    // // Регистрации счёта в песочнице
    // const OpenSandboxAccount = await tinkoffClient.callApi('SandboxService/OpenSandboxAccount');
    // logger.info(`Регистрации счёта в песочнице:\n ${JSON.stringify(OpenSandboxAccount, null, '\t')}\n\n`);

    // // Пополнение баланса счёта песочницы
    // const RUB = {
    //     "accountId": secrets.AccountID,
    //     "amount": {
    //         "nano": 0, // Дробная часть отсутствует
    //         "currency": "RUB",
    //         "units": 30638, // Сумма в рублях
    //     }
    // };
    // const SandboxPayIn = await tinkoffClient.callApi('SandboxService/SandboxPayIn', RUB);
    // logger.info(`Пополнение баланса счёта песочницы:\n ${JSON.stringify(SandboxPayIn, null, '\t')}\n\n`);

    // // Закрытие счёта в песочнице
    // const accountId = {
    //     "accountId": secrets.AccountID
    // };    
    // const CloseSandboxAccount = await tinkoffClient.callApi('SandboxService/CloseSandboxAccount', accountId);
    // logger.info(`Закрытие счёта в песочнице:\n ${JSON.stringify(CloseSandboxAccount, null, '\t')}\n\n`);

    // // Посмотреть счета в песочнице
    // const GetSandboxAccounts = await tinkoffClient.callApi('SandboxService/GetSandboxAccounts');
    // logger.info(`Список счетов в песочнице:\n ${JSON.stringify(GetSandboxAccounts, null, '\t')}\n\n`);

    // // Получить все открытые позиции указанного счёта 
    // const accountId = {
    //     "accountId": secrets.AccountID
    // };
    // const GetSandboxPositions = await tinkoffClient.callApi('OperationsService/GetPositions', accountId);
    // logger.info(`Все открытые позиции счёта ${secrets.AccountID}:\n ${JSON.stringify(GetSandboxPositions, null, '\t')}\n\n`);

    // Функция для отправки рыночного ордера
    // tinkoffClient.placeMarketOrder('BBG004730N88', 1, 'ORDER_DIRECTION_BUY'); // Купить 1 акцию
    // tinkoffClient.placeMarketOrder('BBG004730N88', 1, 'ORDER_DIRECTION_SELL'); // Продать 1 акцию
}

// ======================================================================================
// ============      Запуск функций   ===================================================
// ======================================================================================

sandboxAccount().catch(logger.error);