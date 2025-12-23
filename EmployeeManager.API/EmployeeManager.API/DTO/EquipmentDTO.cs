using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class EquipmentDTO
    {
        public int Id { get; set; }
        
        [Required(ErrorMessage = "Equipment name is required")]
        [StringLength(200, MinimumLength = 1, ErrorMessage = "Name must be between 1 and 200 characters")]
        public string Name { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Serial number is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Serial number must be between 1 and 100 characters")]
        public string SerialNumber { get; set; } = null!;
        
        [Required(ErrorMessage = "Purchase date is required")]
        public DateTime PurchaseDate { get; set; }
        
        public bool IsWork { get; set; } = true;
        
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
