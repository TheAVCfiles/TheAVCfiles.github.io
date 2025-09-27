# TheAVCfiles.github.io

Automated GitHub Pages deployment with dynamic date handling for JSONL file URLs.

## Features

- 🚀 **Automated Deployment**: Content from `public/` directory deployed to GitHub Pages
- 📅 **Dynamic Date Replacement**: Automatically replaces `YYYY-MM-DD` placeholders with current date
- 🔄 **Daily Updates**: Scheduled workflow runs daily to keep date links current
- 📱 **Mobile-Friendly**: Optimized for file uploads from external devices like iPhones
- ⚡ **Serverless Functions**: AI-powered ask function with distributed rate limiting and caching

## Quick Start

1. **Add Content**: Place your static files in the `public/` directory
2. **Use Date Placeholders**: Use `YYYY-MM-DD` in URLs where you want dynamic dates
3. **Push to Main**: Changes to the main branch automatically trigger deployment
4. **Access Site**: Visit your GitHub Pages URL to see the deployed site

## Examples

### HTML with Dynamic Date Links
```html
<a href="https://example.com/data/YYYY-MM-DD.jsonl">Today's Data</a>
```

### JavaScript with Date Replacement
```javascript
const dataUrl = 'https://api.example.com/data/YYYY-MM-DD.json';
```

## Documentation

📖 **[Full Documentation](docs/DEPLOYMENT.md)** - Complete guide including:
- Workflow configuration details
- External device file upload/decoding
- Troubleshooting common issues
- Security considerations
- Testing and validation procedures

## Architecture

- **Source**: `public/` directory contains all static files
- **Processing**: GitHub Actions workflow replaces date placeholders during build
- **Deployment**: Processed files deployed to GitHub Pages automatically
- **Scheduling**: Daily runs ensure date links stay current
- **Serverless Functions**: Netlify functions in `netlify/functions/` directory
  - Redis-based distributed rate limiting
  - Intelligent caching for improved performance
  - Comprehensive logging and monitoring

## Contributing

1. Fork the repository
2. Make changes to files in the `public/` directory
3. Test locally if needed
4. Create a pull request to the main branch

## License

MIT License - see [LICENSE](LICENSE) file for details.