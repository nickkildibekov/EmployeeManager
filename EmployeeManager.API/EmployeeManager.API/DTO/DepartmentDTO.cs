using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class DepartmentDTO
    {
        [Required]
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public List<PositionDTO> Positions { get; set; } = new();
        public List<EmployeeDTO> Employees { get; set; } = new();
    }
}
