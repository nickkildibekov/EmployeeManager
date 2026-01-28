namespace EmployeeManager.API.DTO
{
    public class UtilityPaymentStatisticsDTO
    {
        public List<MonthlyDataPoint> MonthlyExpenses { get; set; } = new();
        public List<MonthlyDataPoint> MonthlyConsumption { get; set; } = new();

        public class MonthlyDataPoint
        {
            public string Month { get; set; } = string.Empty; // Format: "YYYY-MM"
            public decimal Value { get; set; }
        }
    }
}
