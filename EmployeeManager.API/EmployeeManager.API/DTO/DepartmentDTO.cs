using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class DepartmentDTO
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        public List<PositionDTO> Positions { get; set; } = new();
        public List<EmployeeDTO> Employees { get; set; } = new();
    }
}
