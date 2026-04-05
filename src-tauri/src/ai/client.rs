use crate::ai::types::{
    ChatCompletionRequest, ChatCompletionResponse, Message, StreamChunk, StreamDelta, AiError,
};
use reqwest;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct AIClient {
    client: reqwest::Client,
    provider: String,
    endpoint: String,
    api_key: String,
    model: String,
}

impl AIClient {
    pub fn new(
        provider: &str,
        endpoint: &str,
        api_key: &str,
        model: &str,
    ) -> Result<Self, AiError> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .map_err(|e| AiError::ConfigError(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            client,
            provider: provider.to_string(),
            endpoint: endpoint.to_string(),
            api_key: api_key.to_string(),
            model: model.to_string(),
        })
    }

    /// Send chat request and get response
    pub async fn chat(&self, messages: &[Message]) -> Result<String, AiError> {
        let request = ChatCompletionRequest {
            model: self.model.clone(),
            messages: messages.to_vec(),
            temperature: Some(0.3),
            stream: Some(false),
        };

        let response = self
            .client
            .post(&self.endpoint)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await
            .map_err(|e| AiError::HttpError(format!("Request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(AiError::ApiError(format!(
                "API error ({}): {}",
                status, body
            )));
        }

        let result: ChatCompletionResponse = response
            .json()
            .await
            .map_err(|e| AiError::JsonError(format!("Failed to parse response: {}", e)))?;

        if let Some(choice) = result.choices.first() {
            Ok(choice.message.content.clone())
        } else {
            Err(AiError::ApiError("No response from AI".to_string()))
        }
    }

    /// Send chat request with streaming support
    pub async fn chat_stream(
        &self,
        messages: &[Message],
        tx: tokio::sync::mpsc::Sender<String>,
    ) -> Result<(), AiError> {
        let request = ChatCompletionRequest {
            model: self.model.clone(),
            messages: messages.to_vec(),
            temperature: Some(0.3),
            stream: Some(true),
        };

        let response = self
            .client
            .post(&self.endpoint)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await
            .map_err(|e| AiError::HttpError(format!("Request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(AiError::ApiError(format!(
                "API error ({}): {}",
                status, body
            )));
        }

        // Get response as text and parse SSE
        let text = response
            .text()
            .await
            .map_err(|e| AiError::StreamError(format!("Failed to read stream: {}", e)))?;

        // Parse SSE data from complete response
        for line in text.lines() {
            let line = line.trim();
            if !line.starts_with("data: ") {
                continue;
            }

            let data = &line[6..];
            if data == "[DONE]" {
                continue;
            }

            if let Ok(parsed) = serde_json::from_str::<StreamChunk>(data) {
                if let Some(choice) = parsed.choices.first() {
                    if let Some(content) = &choice.delta.content {
                        tx.send(content.clone())
                            .await
                            .map_err(|e| AiError::StreamError(format!("Send error: {}", e)))?;
                    }
                }
            }
        }

        Ok(())
    }

    pub fn get_provider(&self) -> &str {
        &self.provider
    }

    pub fn get_model(&self) -> &str {
        &self.model
    }
}
