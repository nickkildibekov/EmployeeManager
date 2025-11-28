using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class PositionDTO
    {
        [Required]
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "DepartmentId is required.")]
        public int DepartmentId { get; set; }

    }
}
