namespace EmployeeManager.API.Models
{
    public class Equipment
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string? SerialNumber { get; set; }
        public DateTime PurchaseDate { get; set; }
        public string Status { get; set; } = "Used";
        public string Measurement { get; set; } = "Unit";
        public decimal Amount { get; set; } = 1m;
        public string? ImageData { get; set; } // Base64-encoded image
        public int? DepartmentId { get; set; }
        public Department? Department { get; set; }
        public int CategoryId { get; set; }
        public EquipmentCategory? Category { get; set; }

    }
}
