using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class PositionDTO
    {
        [Required]
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int DepartmentId { get; set; }

    }
}
