/**
 * SilverFir Bot 🌲 - [Node.js Release]
 * 
 * Логирование и вывод в консоль и в файл
 * ======================================
 *  
 * @version 1.0.0
 * @license Apache-2.0
 * @author Михаил Шардин [Mikhail Shardin]
 * @site https://shardin.name/
 * @repository https://github.com/empenoso?tab=repositories
 * 
 * Last updated: 27.09.2024
 */


const {
    createLogger,
    format,
    transports
} = require('winston');
const { combine, timestamp, printf } = format;
const path = require('path');
const moment = require('moment-timezone'); // Использую moment-timezone для поддержки часовых поясов

// Определение формата журнала
const logFormat = printf(({ level, message, timestamp }) => {
    const formattedTimestamp = moment(timestamp).tz('Asia/Yekaterinburg').format('YYYY-MM-DD HH:mm:ss');
    return `${formattedTimestamp} [${level.toUpperCase()}]: ${message}`;
});

// Получение текущей даты в формате YYYY-MM-DD для имени файла
const getDailyLogFileName = () => {
    const currentDate = moment().format('YYYY-MM-DD');
    return path.join(__dirname, `../../logs/trading_${currentDate}.log`);
};

// Настройка конфигурации логгера
const logger = createLogger({
    format: combine(
        timestamp(),
        logFormat
    ),
    transports: [
        // Транспорт для вывода в консоль всех уровней
        new transports.Console({
            level: 'info' // Показывает все сообщения уровня 'info' и выше в консоли
        }),

        // Транспорт для записи 'info' сообщений в файл с датированным именем
        new transports.File({
            filename: getDailyLogFileName(), // Записывает 'info' сообщения в файл с шаблоном trading_YYYY-MM-DD.log
            level: 'info'
        }),

        // Транспорт для записи 'warn' и 'error' сообщений в файл trading.log
        new transports.File({
            filename: path.join(__dirname, '../../logs/trading.log'), // Записывает 'warn' и 'error' в постоянный файл
            level: 'warn' // Записывает только 'warn' и 'error'
        })
    ]
});

// Экспорт экземпляра логгера
module.exports = logger;
