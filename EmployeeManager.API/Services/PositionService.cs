using EmployeeManager.API.DTO;
using EmployeeManager.API.Models;
using EmployeeManager.API.Repositories;
using Microsoft.EntityFrameworkCore;

namespace EmployeeManager.API.Services
{
    public class PositionService : IPositionService
    {
        private readonly IPositionRepository _positionRepository;
        private readonly IDepartmentPositionRepository _departmentPositionRepository;
        private readonly IDepartmentRepository _departmentRepository;

        public PositionService(
            IPositionRepository positionRepository,
            IDepartmentPositionRepository departmentPositionRepository,
            IDepartmentRepository departmentRepository)
        {
            _positionRepository = positionRepository;
            _departmentPositionRepository = departmentPositionRepository;
            _departmentRepository = departmentRepository;
        }

        public async Task<IEnumerable<PositionDTO>> GetAllAsync(Guid? departmentId = null, CancellationToken cancellationToken = default)
        {
            var positions = await _positionRepository.GetAllAsync(cancellationToken);
            
            if (departmentId.HasValue)
            {
                var deptPositions = await _departmentPositionRepository.GetByDepartmentIdAsync(departmentId.Value, cancellationToken);
                var positionIds = deptPositions.Select(dp => dp.PositionId).ToHashSet();
                positions = positions.Where(p => positionIds.Contains(p.Id));
            }

            return positions.Select(p => new PositionDTO { Id = p.Id, Title = p.Title });
        }

        public async Task<PositionDTO?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var position = await _positionRepository.GetByIdAsync(id, cancellationToken);
            if (position == null) return null;

            return new PositionDTO { Id = position.Id, Title = position.Title };
        }

        public async Task<PositionDTO> CreateAsync(PositionDTO positionDto, CancellationToken cancellationToken = default)
        {
            var position = new Position { Title = positionDto.Title };
            var created = await _positionRepository.AddAsync(position, cancellationToken);
            return new PositionDTO { Id = created.Id, Title = created.Title };
        }

        public async Task<PositionDTO?> UpdateAsync(Guid id, PositionUpdateDTO positionDto, CancellationToken cancellationToken = default)
        {
            var position = await _positionRepository.GetByIdAsync(id);
            if (position == null) return null;

            position.Title = positionDto.Title;

            // Update department-position links
            var existingLinks = await _departmentPositionRepository.GetByPositionIdAsync(id);
            var incomingIds = new HashSet<Guid>(positionDto.DepartmentIds);

            var linksToRemove = existingLinks
                .Where(dp => !incomingIds.Contains(dp.DepartmentId))
                .ToList();
            await _departmentPositionRepository.RemoveRangeAsync(linksToRemove);

            var existingIds = new HashSet<Guid>(existingLinks.Select(dp => dp.DepartmentId));
            var linksToAdd = incomingIds
                .Where(depId => !existingIds.Contains(depId))
                .Select(depId => new DepartmentPosition { DepartmentId = depId, PositionId = position.Id })
                .ToList();
            await _departmentPositionRepository.AddRangeAsync(linksToAdd);
            await _departmentPositionRepository.SaveChangesAsync();

            await _positionRepository.UpdateAsync(position);
            return new PositionDTO { Id = position.Id, Title = position.Title };
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var position = await _positionRepository.GetByIdAsync(id);
            if (position == null) return false;

            // Remove department-position links
            var links = await _departmentPositionRepository.GetByPositionIdAsync(id);
            await _departmentPositionRepository.RemoveRangeAsync(links);
            await _departmentPositionRepository.SaveChangesAsync();

            await _positionRepository.DeleteAsync(position);
            return true;
        }
    }
}
