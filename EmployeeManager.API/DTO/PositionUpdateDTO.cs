using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class PositionUpdateDTO: PositionDTO
    {
        [Required]
        public List<int> DepartmentIds { get; set; } = new List<int>();
    }
}
