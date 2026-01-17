using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class EmployeeDTO
    {
        public int Id { get; set; }
        
        [Required(ErrorMessage = "First name is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "First name must be between 1 and 100 characters")]
        public string FirstName { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Last name is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Last name must be between 1 and 100 characters")]
        public string LastName { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Phone number is required")]
        [Phone(ErrorMessage = "Invalid phone number format")]
        [StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters")]
        public string PhoneNumber { get; set; } = string.Empty;

        public int? PositionId { get; set; }
        public string? PositionName { get; set; }

        public int? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        [Required(ErrorMessage = "Specialization is required")]
        [Range(1, int.MaxValue, ErrorMessage = "Valid specialization must be selected")]
        public int SpecializationId { get; set; }
        
        public string? SpecializationName { get; set; }
    }
}
