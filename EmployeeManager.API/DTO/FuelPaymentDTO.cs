using EmployeeManager.API.Models;

namespace EmployeeManager.API.DTO
{
    public class FuelPaymentDTO
    {
        public Guid TransactionId { get; set; }
        public Guid Id { get; set; }
        public string TransactionType { get; set; } = "Expense"; // "Expense" або "Income"
        public Guid DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public Guid? ResponsibleEmployeeId { get; set; }
        public string? ResponsibleEmployeeName { get; set; }
        public Guid EquipmentId { get; set; }
        public string? EquipmentName { get; set; }
        public DateTime EntryDate { get; set; }
        public decimal PreviousMileage { get; set; }
        public decimal CurrentMileage { get; set; }
        public FuelType FuelType { get; set; }
        public string FuelTypeName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal FuelAmount { get; set; } // Кількість палива (для Expense - витрачене, для Income - додане)
        public string? OdometerImageUrl { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class FuelPaymentCreateDTO
    {
        public Guid DepartmentId { get; set; }
        public Guid? ResponsibleEmployeeId { get; set; }
        public Guid EquipmentId { get; set; }
        public DateTime EntryDate { get; set; }
        public decimal PreviousMileage { get; set; }
        public decimal CurrentMileage { get; set; }
        public FuelType FuelType { get; set; }
        public decimal TotalAmount { get; set; }
    }

    public class FuelTransactionDTO
    {
        public Guid Id { get; set; }
        public Guid DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public FuelType Type { get; set; }
        public string FuelTypeName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public Guid RelatedId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class FuelPaymentStatisticsDTO
    {
        public List<MonthlyDataPoint> MonthlyExpenses { get; set; } = new();
        public List<MonthlyDataPoint> MonthlyConsumption { get; set; } = new(); // Пробіг в км

        public class MonthlyDataPoint
        {
            public string Month { get; set; } = string.Empty; // Format: "YYYY-MM"
            public decimal Value { get; set; }
        }
    }
}
