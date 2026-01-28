using System.ComponentModel.DataAnnotations;

namespace EmployeeManager.API.DTO
{
    public class PositionUpdateDTO: PositionDTO
    {
        [Required]
        public List<Guid> DepartmentIds { get; set; } = new List<Guid>();
    }
}
