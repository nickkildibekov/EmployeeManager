using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class DepartmentDTO
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }
}
