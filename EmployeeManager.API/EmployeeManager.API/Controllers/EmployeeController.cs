using EmployeeManager.API.Data;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeManager.API.Controllers
{

    [ApiController]
    [Route("api/[controller]")]
    public class EmployeeController: ControllerBase
    {
        private readonly AppDbContext _appDbContext;

        public EmployeeController(AppDbContext appDbContext)
        {
            _appDbContext = appDbContext;
        }

        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new { message = "Server is running"});
        }
    }
}
