"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dashboardData_1 = require("../dashboardData");
describe('getMonthsInRange', () => {
    it('should return the correct months for a 7-day range', () => {
        const result = (0, dashboardData_1.getMonthsInRange)('7d');
        expect(result.length).toBe(3);
    });
    it('should return the correct months for a 30-day range', () => {
        const result = (0, dashboardData_1.getMonthsInRange)('30d');
        expect(result.length).toBe(3);
    });
    it('should return the correct months for a 90-day range', () => {
        const result = (0, dashboardData_1.getMonthsInRange)('90d');
        expect(result.length).toBe(6);
    });
    it('should return the correct months for a 1-year range', () => {
        const result = (0, dashboardData_1.getMonthsInRange)('1y');
        expect(result.length).toBe(12);
    });
});
//# sourceMappingURL=dashboardData.test.js.map
