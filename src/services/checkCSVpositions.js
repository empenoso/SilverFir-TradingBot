/**
 * SilverFir Bot 🌲 - [Node.js Release]
 * 
 * Модуль который проверяет соответствие CSV файла учёта ответу сервера 
 * ===================================================================
 * 
 * @version 1.0.0
 * @license Apache-2.0
 * @author Михаил Шардин [Mikhail Shardin]
 * @site https://shardin.name/
 * @repository https://github.com/empenoso/SilverFir-TradingBot
 * 
 * Last updated: 05.10.2024
 */

const logger = require('./logService'); // Логирование в файл и консоль
const logFunctionName = require('./logFunctionName'); // Получение имени функции

const secrets = require('../../config/secrets'); // Ключи доступа и идентификаторы
const config = require('../../config/config'); // Параметры
const csvHandler = require('./csvHandler'); // Работа с CSV файлами

const TinkoffClient = require('../grpc/tinkoffClient'); // Модуль для взаимодействия с API Tinkoff Invest
const API_TOKEN = secrets.TbankSandboxMode;
const tinkoffClient = new TinkoffClient(API_TOKEN);

// Функция для получения всех позиций с сервера
async function getServerPositions() {
    try {
        const accountId = {
            accountId: secrets.AccountID
        };
        const response = await tinkoffClient.callApi('OperationsService/GetPositions', accountId);

        // Логируем полученные позиции с сервера
        logger.info(`Все открытые позиции счета ${secrets.AccountID}:\n ${JSON.stringify(response, null, '\t')}\n\n`);

        // Возвращаем только позиции с ценными бумагами (securities)
        return response.securities.map(sec => ({
            figi: sec.figi,
            balance: parseFloat(sec.balance) // Преобразуем баланс в float
        }));
    } catch (error) {
        logger.error(`Ошибка при получении позиций с сервера: ${error.message}`);
        throw error;
    }
}

// Функция для проверки расхождений
async function checkForDiscrepancies() {
    try {
        // Загружаем текущие позиции из CSV файла
        var csvPositions = await csvHandler.loadPositions();

        // Получаем позиции с сервера
        const serverPositions = await getServerPositions();

        // Проверяем каждую позицию из CSV
        for (const csvPosition of csvPositions) {
            // Находим соответствующую позицию с сервера
            const serverPosition = serverPositions.find(pos => pos.figi === csvPosition.figi);

            if (serverPosition) {
                const lotSize = await tinkoffClient.getLot(csvPosition.figi);
                logger.info(`Количество бумаг в лоте ${csvPosition.figi}: ${lotSize} шт.`);
                const csvTotal = csvPosition.quantity * lotSize;

                // Сравниваем количество позиций
                if (csvTotal !== serverPosition.balance) {
                    // Если есть расхождение, логируем ошибку и останавливаем торгового робота
                    logger.error(`Ошибка: Несоответствие по FIGI ${csvPosition.figi}. CSV: ${csvTotal}, Сервер: ${serverPosition.balance}`);
                    throw new Error('Найдено несоответствие позиций. Остановка торговли.');
                }
            } else {
                logger.error(`Ошибка: Позиция с FIGI ${csvPosition.figi} отсутствует на сервере.`);
                throw new Error('Найдено несоответствие позиций. Остановка торговли.');
            }
        }

        logger.info('Все позиции совпадают. Торговля продолжается.');
    } catch (error) {
        logger.error(`Ошибка при проверке позиций: ${error.message}`);
        // Останавливаем торгового робота (добавьте здесь вашу логику остановки)
    }
}

// Экспортируем функции
module.exports = {
    checkForDiscrepancies
};

// checkForDiscrepancies().catch(logger.error);