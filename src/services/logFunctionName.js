/**
 * SilverFir Bot 🌲 - [Node.js Release]
 * 
 * Получение имени функции
 * ========================
 * 
 * @version 1.0.0
 * @license Apache-2.0
 * @author Михаил Шардин [Mikhail Shardin]
 * @site https://shardin.name/
 * @repository https://github.com/empenoso/SilverFir-TradingBot
 * 
 * Last updated: 28.09.2024
 */


function logFunctionName() {
    try {
        // Создаем новый объект Error и получаем его stack trace
        const stack = new Error().stack;
        
        // Извлекаем строку вызова функции из стека
        const callerLine = stack.split('\n')[2]; // 2 - это уровень стека, который нам нужен
        
        // Проверяем наличие функции и если её нет, возвращаем 'anonymous'
        if (callerLine) {
            const functionNameMatch = callerLine.trim().match(/at (\S+)/); // Ищем имя функции
            return functionNameMatch ? functionNameMatch[1] : 'anonymous';
        }
        
        return 'anonymous'; // Возвращаем 'anonymous', если не удалось найти имя функции
    } catch (err) {
        return 'unknown'; // В случае ошибки возвращаем 'unknown'
    }
}

module.exports = logFunctionName;
