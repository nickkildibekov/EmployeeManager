using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class EmployeeDTO
    {
        public Guid Id { get; set; }
        
        [StringLength(100, ErrorMessage = "First name cannot exceed 100 characters")]
        public string? FirstName { get; set; }
        
        [StringLength(100, ErrorMessage = "Last name cannot exceed 100 characters")]
        public string? LastName { get; set; }
        
        [Required(ErrorMessage = "Call sign is required")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Call sign must be between 1 and 100 characters")]
        public string CallSign { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Phone number is required")]
        [Phone(ErrorMessage = "Invalid phone number format")]
        [StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters")]
        public string PhoneNumber { get; set; } = string.Empty;

        public DateTime? BirthDate { get; set; }

        public Guid? PositionId { get; set; }
        public string? PositionName { get; set; }

        public Guid? DepartmentId { get; set; }
        public string? DepartmentName { get; set; }

        [Required(ErrorMessage = "Specialization is required")]
        public Guid SpecializationId { get; set; }
        
        public string? SpecializationName { get; set; }
    }
}
