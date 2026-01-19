using EmployeeManager.API.Data;
using EmployeeManager.API.Models;

namespace EmployeeManager.API.Repositories
{
    public class EquipmentCategoryRepository : Repository<EquipmentCategory>, IEquipmentCategoryRepository
    {
        public EquipmentCategoryRepository(AppDbContext context) : base(context)
        {
        }
    }
}
