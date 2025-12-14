namespace EmployeeManager.API.DTO
{
    public class EquipmentDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string SerialNumber { get; set; } = null!;
        public DateTime PurchaseDate { get; set; }
        public bool IsWork { get; set; } = true;
        public string Description { get; set; } = string.Empty;       
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public int DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
    }
}
