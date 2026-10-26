public class Post
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
}