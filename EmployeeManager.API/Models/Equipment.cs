namespace EmployeeManager.API.Models
{
    public class Equipment
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string? SerialNumber { get; set; }
        public DateTime PurchaseDate { get; set; }
        public string Status { get; set; } = "Used";
        public string Measurement { get; set; } = "Unit";
        public decimal Amount { get; set; } = 1m;
        public string? ImageData { get; set; } // Base64-encoded image
        public Guid? DepartmentId { get; set; }
        public Department? Department { get; set; }
        public Guid CategoryId { get; set; }
        public EquipmentCategory? Category { get; set; }
        public Guid? ResponsibleEmployeeId { get; set; }
        public Employee? ResponsibleEmployee { get; set; }
    }
}
