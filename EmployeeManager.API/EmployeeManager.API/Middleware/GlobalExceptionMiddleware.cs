using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Text.Json;

namespace EmployeeManager.API.Middleware
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception occurred");
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            var response = exception switch
            {
                DbUpdateConcurrencyException => new
                {
                    statusCode = (int)HttpStatusCode.Conflict,
                    message = "The record was modified by another user. Please refresh and try again."
                },
                DbUpdateException dbEx when dbEx.InnerException?.Message?.Contains("UNIQUE constraint") == true ||
                                           dbEx.InnerException?.Message?.Contains("duplicate key") == true => new
                {
                    statusCode = (int)HttpStatusCode.Conflict,
                    message = "A record with this value already exists."
                },
                DbUpdateException dbEx when dbEx.InnerException?.Message?.Contains("FOREIGN KEY constraint") == true ||
                                           dbEx.InnerException?.Message?.Contains("REFERENCE constraint") == true => new
                {
                    statusCode = (int)HttpStatusCode.Conflict,
                    message = "Cannot complete operation due to related records."
                },
                DbUpdateException => new
                {
                    statusCode = (int)HttpStatusCode.Conflict,
                    message = "Cannot complete operation due to database constraint."
                },
                ArgumentException => new
                {
                    statusCode = (int)HttpStatusCode.BadRequest,
                    message = exception.Message
                },
                InvalidOperationException => new
                {
                    statusCode = (int)HttpStatusCode.BadRequest,
                    message = exception.Message
                },
                _ => new
                {
                    statusCode = (int)HttpStatusCode.InternalServerError,
                    message = "An unexpected error occurred. Please try again later."
                }
            };

            context.Response.StatusCode = response.statusCode;

            var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            return context.Response.WriteAsync(jsonResponse);
        }
    }
}
