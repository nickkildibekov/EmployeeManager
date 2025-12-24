using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class EquipmentDTO
    {
        public int Id { get; set; }
        
        [Required(ErrorMessage = "Equipment name is required")]
        [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters")]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(100, ErrorMessage = "Serial number must not exceed 100 characters")]
        public string? SerialNumber { get; set; }
        
        [Required(ErrorMessage = "Purchase date is required")]
        public DateTime PurchaseDate { get; set; }

        [Required(ErrorMessage = "Status is required")]
        [RegularExpression("^(Used|NotUsed|Broken)$", ErrorMessage = "Status must be Used, NotUsed, or Broken")]
        public string Status { get; set; } = "Used";

        [Required(ErrorMessage = "Measurement is required")]
        [RegularExpression("^(Unit|Meter|Liter)$", ErrorMessage = "Measurement must be Unit, Meter, or Liter")]
        public string Measurement { get; set; } = "Unit";

        // Use double-based range to avoid culture-specific decimal parsing issues
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; } = 1m;
        
        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters")]
        public string Description { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Category is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Valid category must be selected")]
        public int CategoryId { get; set; }
        
        public string CategoryName { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Department is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Valid department must be selected")]
        public int DepartmentId { get; set; }
        
        public string DepartmentName { get; set; } = string.Empty;
    }
}
