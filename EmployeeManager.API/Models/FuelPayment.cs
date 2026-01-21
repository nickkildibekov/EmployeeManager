namespace EmployeeManager.API.Models
{
    public class FuelPayment
    {
        public Guid Id { get; set; }
        public Guid DepartmentId { get; set; }
        public Department? Department { get; set; }
        public Guid? ResponsibleEmployeeId { get; set; }
        public Employee? ResponsibleEmployee { get; set; }
        public Guid EquipmentId { get; set; }
        public Equipment? Equipment { get; set; }
        public DateTime EntryDate { get; set; } // Дата внесення (не місяць)
        public decimal PreviousMileage { get; set; } // Попередній пробіг
        public decimal CurrentMileage { get; set; } // Поточний пробіг
        public decimal PricePerLiter { get; set; } // Ціна за літр
        public FuelType FuelType { get; set; } // Тип палива
        public decimal TotalAmount { get; set; } // Загальна сума
        public string? OdometerImageUrl { get; set; } // URL фото спідометра
        public DateTime CreatedAt { get; set; }
    }
}
