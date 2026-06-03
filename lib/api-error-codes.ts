// API Error Codes Documentation
// These error codes are returned by the extraction API when errors occur

export const API_ERROR_CODES_DOC = `
## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| EXTRACTION_PIPELINE_FAILURE | 500 | The extraction pipeline encountered an unexpected error. Please try again or contact support. |
| MODEL_COMPLIANCE_REFUSAL | 403 | The AI model refused to process this content due to safety/compliance policies. |
| SCHEMA_MISMATCH_EMPTY_OUTPUT | 422 | The extraction returned empty or invalid data. The document may not contain the requested fields. |
| UNREADABLE_IMAGE_CONTENT | 422 | The image/document could not be read. Please ensure the file is clear, properly oriented, and not corrupted. |

## Error Response Format

\`\`\`json
{
  "success": false,
  "error": "Human-readable error message",
  "error_code": "EXTRACTION_PIPELINE_FAILURE",
  "error_details": {
    "code": "EXTRACTION_PIPELINE_FAILURE",
    "status": 500,
    "message": "The extraction pipeline encountered an unexpected error."
  }
}
\`\`\`
`

export const API_ERROR_CODES_SHORT = `Error Codes: EXTRACTION_PIPELINE_FAILURE (500), MODEL_COMPLIANCE_REFUSAL (403), SCHEMA_MISMATCH_EMPTY_OUTPUT (422), UNREADABLE_IMAGE_CONTENT (422)`
