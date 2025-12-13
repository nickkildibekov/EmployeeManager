namespace EmployeeManager.API.Models
{
    public class Equipment
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string SerialNumber { get; set; } = null!;
        public DateTime PurchaseDate { get; set; }
        public bool IsWork { get; set; } = true;
        public int DepartmentId { get; set; }
        public Department? Department { get; set; }
        public int CategoryId { get; set; }
        public EquipmentCategory? Category { get; set; }

    }
}
