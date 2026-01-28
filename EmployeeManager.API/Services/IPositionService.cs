using EmployeeManager.API.DTO;

namespace EmployeeManager.API.Services
{
    public interface IPositionService
    {
        Task<IEnumerable<PositionDTO>> GetAllAsync(Guid? departmentId = null, CancellationToken cancellationToken = default);
        Task<PositionDTO?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<PositionDTO> CreateAsync(PositionDTO positionDto, CancellationToken cancellationToken = default);
        Task<PositionDTO?> UpdateAsync(Guid id, PositionUpdateDTO positionDto, CancellationToken cancellationToken = default);
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
