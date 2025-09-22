# GitHub Pages Deployment with Dynamic Date Handling

This repository automatically deploys to GitHub Pages with dynamic date replacement for JSONL file URLs.

## Features

### 1. Automated Deployment
- **Source**: Content from the `public/` directory is deployed to GitHub Pages
- **Branch**: Deploys from the `main` branch to GitHub Pages
- **Trigger**: Automatic deployment on push to main, manual trigger, and daily at 00:01 UTC

### 2. Dynamic Date Replacement
- **Placeholder**: Any occurrence of `YYYY-MM-DD` in HTML, JS, and JSON files
- **Replacement**: Current date in `YYYY-MM-DD` format (e.g., `2025-01-15`)
- **Use Case**: Automatically link to daily JSONL files or other date-specific resources

### 3. Workflow Components
- **Build Job**: Processes files and replaces date placeholders
- **Deploy Job**: Uploads processed content to GitHub Pages
- **Scheduling**: Daily updates ensure date links stay current

## File Structure

```
TheAVCfiles.github.io/
├── public/                     # Source files for GitHub Pages
│   ├── index.html             # Main page with JSONL date links
│   └── [other static files]   # CSS, JS, images, etc.
├── .github/workflows/
│   └── deploy-pages.yml       # Deployment workflow
├── docs/
│   └── DEPLOYMENT.md          # This documentation
└── README.md
```

## Usage Examples

### HTML File with Date Placeholder
```html
<a href="https://example.com/data/YYYY-MM-DD.jsonl">Today's Data</a>
```

### JavaScript with Date Placeholder
```javascript
const dataUrl = 'https://api.example.com/data/YYYY-MM-DD.json';
```

### JSON Configuration with Date Placeholder
```json
{
  "dataSource": "https://storage.example.com/files/YYYY-MM-DD.jsonl",
  "lastUpdated": "YYYY-MM-DD"
}
```

## External Device File Upload/Decoding

### Common Issues and Solutions

#### 1. iPhone File Upload Issues
**Problem**: Files from iPhone may have encoding issues or unexpected formats.

**Solutions**:
- **File Format**: Ensure files are saved in UTF-8 encoding
- **JSONL Validation**: Validate JSONL format before upload
- **File Names**: Use simple, date-based naming conventions (e.g., `2025-01-15.jsonl`)

**Recommended Workflow**:
1. Export data from iPhone app in JSONL format
2. Verify file encoding is UTF-8
3. Name file with date pattern: `YYYY-MM-DD.jsonl`
4. Upload to your data storage service
5. The GitHub Pages site will automatically link to the current date's file

#### 2. File Size and Performance
**Problem**: Large JSONL files may cause loading issues.

**Solutions**:
- **Compression**: Consider gzipping large files
- **Chunking**: Split large files into smaller daily chunks
- **CDN**: Use a CDN for better file delivery performance

#### 3. Cross-Origin Resource Sharing (CORS)
**Problem**: Browser may block loading external JSONL files.

**Solutions**:
- Configure CORS headers on your file hosting service
- Use same-origin hosting when possible
- Implement server-side proxy if needed

### File Upload Best Practices

1. **Consistent Naming**: Always use `YYYY-MM-DD.jsonl` format
2. **Validation**: Validate JSONL syntax before upload
3. **Backup**: Keep local backups of uploaded files
4. **Monitoring**: Set up alerts for missing daily files
5. **Fallback**: Implement graceful handling for missing files

### Troubleshooting Upload Issues

#### iPhone Specific Issues:
- **Encoding Problems**: Use apps that guarantee UTF-8 output
- **File Access**: Ensure iOS app has proper file system permissions
- **Network Issues**: Check for stable internet connection during upload
- **App Compatibility**: Test with different JSONL export apps if needed

#### General Upload Issues:
- **File Permissions**: Verify upload destination has write permissions
- **Network Timeout**: Implement retry logic for failed uploads
- **File Corruption**: Add checksum validation for uploaded files
- **Storage Limits**: Monitor storage quota and implement cleanup policies

## Testing and Validation

### Local Testing
1. Clone the repository
2. Make changes to files in the `public/` directory
3. Test locally by opening `public/index.html` in a browser
4. Push changes to main branch to trigger deployment

### Production Validation
1. Check that GitHub Pages site loads correctly
2. Verify that date placeholders are replaced with current date
3. Test JSONL file links resolve correctly
4. Monitor workflow execution in Actions tab

### Date Replacement Testing
- Search for any remaining `YYYY-MM-DD` patterns in deployed site
- Verify links point to correctly formatted dates
- Test on different timezones if needed

## Maintenance

### Daily Operations
- Workflow runs automatically daily to update dates
- Monitor for workflow failures in GitHub Actions
- Check that JSONL files are available for current date

### Periodic Tasks
- Review and update external file hosting configuration
- Update documentation for new file formats or sources
- Monitor performance and optimize as needed

## Security Considerations

1. **File Validation**: Validate all uploaded JSONL files
2. **Access Control**: Implement proper access controls for file uploads
3. **Content Security**: Use Content Security Policy headers
4. **HTTPS**: Ensure all external links use HTTPS
5. **Monitoring**: Monitor for unauthorized access or modifications