# Gemini Review: AWS Lambda Form Processor

This review outlines potential issues and recommendations for the `aws-lambda-form-processor` repository.

## 1. `template.yaml`

### 1.1. API Gateway CORS Configuration

The `AllowOrigin` property for the API Gateway CORS configuration is likely misconfigured. The single quotes in `!Sub "'${AllowedOrigins}'"` will be treated as literal characters, causing CORS checks to fail.

**Recommendation:**

Use the `!Join` intrinsic function to correctly format the `AllowedOrigins` list.

```yaml
# Incorrect
AllowOrigin: !Sub "'${AllowedOrigins}'"

# Correct
AllowOrigin: !Join [ ",", !Ref AllowedOrigins ]
```

However, the `AllowOrigin` in the `Cors` property of a `AWS::Serverless::Api` resource expects a single origin. To support multiple origins, you should handle the CORS headers in the Lambda function itself and remove the `Cors` configuration from the API Gateway resource. The `handleOptionsRequest` and `createCorsResponse` functions in `src/cors.ts` suggest that this is the intended approach.

Therefore, the `Cors` block in `template.yaml` should be removed.

### 1.2. Lambda Function `CodeUri`

The `CodeUri` for the `FormProcessorFunction` is set to `src/`, but the compiled JavaScript files will be in the `dist/` directory.

**Recommendation:**

Change the `CodeUri` to `dist/`.

```yaml
# Incorrect
CodeUri: src/

# Correct
CodeUri: dist/
```

### 1.3. Node.js Runtime

The Lambda function is using the `nodejs18.x` runtime. Node.js 20.x is the latest LTS version and should be used instead.

**Recommendation:**

Update the runtime to `nodejs20.x`.

```yaml
# Incorrect
Runtime: nodejs18.x

# Correct
Runtime: nodejs20.x
```

## 2. `package.json`

### 2.1. Missing `sam build` Step

The `deploy` and `deploy:prod` scripts in `package.json` are missing the `sam build` step. This will cause deployments to fail because the code will not be packaged correctly.

**Recommendation:**

Add `sam build` to the deploy scripts.

```json
// Incorrect
"scripts": {
  "deploy": "sam deploy --guided",
  "deploy:prod": "sam deploy",
  ...
}

// Correct
"scripts": {
  "deploy": "sam build && sam deploy --guided",
  "deploy:prod": "sam build && sam deploy",
  ...
}
```

### 2.2. `crypto` Dependency

The `crypto` package is a built-in Node.js module and should not be listed as a dependency in `package.json`.

**Recommendation:**

Remove the `crypto` dependency.

```json
// Incorrect
"dependencies": {
  ...
  "crypto": "^1.0.1"
},

// Correct
"dependencies": {
  ...
},
```

## 3. `.github/workflows/deploy.yml`

### 3.1. Missing `sam build` Step

The `deploy.yml` workflow is missing the `sam build` step.

**Recommendation:**

Add a `sam build` step before the `sam deploy` step.

```yaml
# Incorrect
- name: Deploy SAM application
  run: sam deploy --no-confirm-changeset --no-fail-on-empty-changeset

# Correct
- name: Build SAM application
  run: sam build

- name: Deploy SAM application
  run: sam deploy --no-confirm-changeset --no-fail-on-empty-changeset
```

### 3.2. Node.js Version

The workflow is using Node.js 18. This should be updated to 20 to match the recommended Lambda runtime.

**Recommendation:**

Update the Node.js version to 20.

```yaml
# Incorrect
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '18'

# Correct
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
```
