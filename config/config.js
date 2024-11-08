/**
 * SilverFir Bot 🌲 [Node.js Release]
 * 
 * Настройки [config.js]
 *
 * @author Михаил Шардин [Mikhail Shardin]
 * Last updated: 16.09.2024
 * 
 */

const TinkoffClient = require('../src/grpc/tinkoffClient'); // модуль для взаимодействия с API Tinkoff Invest
const secrets = require('./secrets'); // Ключи доступа и идентификаторы
const logger = require('../src/services/logService'); // Логирование в файл и консоль

const API_TOKEN = secrets.TbankSandboxMode;
const tinkoffClient = new TinkoffClient(API_TOKEN);


module.exports = {
    //
    tradingLimit: 30000, // Начальный торговый лимит
    startDate: new Date("2024-10-01"), // Начальная торговая дата для расчёта доходности
    //
    maxPositionPercentage: 0.1, // Максимально допустимая доля позиции на одну ценную бумагу (10%)
    maxLossThreshold: 0.001, // 0.05  // Устанавливаем порог потери в 5%
    // Тикеры и FIGI идентификаторы тикеров
    securitiesToMonitorTikerArray: ["VTBR","MTLR","UWGN","RNFT","EUTR","SNGSP","GAZP","ROSN","SBER","SGZH","AFLT","VKCO","RUAL","TATN"], 
    securitiesToMonitorFigiArray: ["BBG004730ZJ9","BBG004S68598","BBG008HD3V85","BBG00F9XX7H4","TCS00A1002V2","BBG004S681M2","BBG004730RP0","BBG004731354","BBG004730N88","BBG0100R9963","BBG004S683W7","TCS00A106YF0","BBG008F2T3T2","BBG004RVFFC0"], 
    //
    SimpleMovingAverageLength_FiveMinutes: 6, // 36
    SimpleMovingAverageLength_OneHour: 3, // 16

    async getPurchaseQuantity(price, figi) { // Асинхронная функция для получения количества лотов для покупки
        try {
            const lotSize = await tinkoffClient.getLot(figi); // Получаем размер лота
            if (lotSize > 0) {
                // Рассчитываем максимальное количество лотов, которое можно купить на основе лимита и цены
                const maxAmountToInvest = this.tradingLimit * this.maxPositionPercentage;
                const lots = Math.floor(maxAmountToInvest / (price * lotSize))
                // logger.info(`Расчётное количество лотов ${figi} к покупке: ${lots}`);
                return lots; // Количество лотов
            } else {
                logger.error(`Невозможно получить размер лота по FIGI: ${figi}`);
                return 0;
            }
        } catch (error) {
            logger.error('Ошибка расчета количества лотов для покупки:', error.message);
            return 0; // Возвращаем 0 в случае ошибки
        }
    },

    getSellQuantity(ticker) {
        // Реализовать логику для возврата количества лотов для продажи
    }
};