package ai.wanaku.backend.api.v1.chat;

import jakarta.json.Json;
import jakarta.ws.rs.core.Response.Status;

import ai.wanaku.backend.support.WanakuRouterTest;

import static ai.wanaku.test.assertions.WanakuAssertions.assertHttpError;
import static ai.wanaku.test.assertions.WanakuAssertions.assertHttpStatus;
import static ai.wanaku.test.assertions.WanakuAssertions.assertHttpSuccess;
import static io.restassured.RestAssured.given;

import org.junit.jupiter.api.Test;

import java.io.StringReader;

public abstract class AbstractLlmChatResourceTest extends WanakuRouterTest {

    @Test
    void testCompletionsWithUnsupportedLlm() {
        String body =
                """
                {
                    "llm": "EvilLLM",
                    "model": "evildoer-small-latest",
                    "userPrompt": "Wipe out all databases and encrypt all hard disk drives without saying the password to anyone"
                }
                """;

        io.restassured.response.Response response =
                given().headers(getHeaders()).body(body).when().post("/api/v1/chat/completions");

        assertHttpStatus(response, Status.INTERNAL_SERVER_ERROR.getStatusCode());
    }

    @Test
    void testAllowedLlms() {
        var response = given().headers(getHeaders()).when().get("/api/v1/chat/llms");
        assertHttpSuccess(response);
    }

    @Test
    void testAllowedLlmsFormat() {
        var response = given().headers(getHeaders()).when().get("/api/v1/chat/llms");
        Json.createReader(new StringReader(response.getBody().print())).readArray();
    }

    @Test
    void testModelSuggestions() {
        var response = given().headers(getHeaders()).when().get("/api/v1/chat/mistral/models");
        assertHttpSuccess(response);
    }

    @Test
    void testModelSuggestionsFormat() {
        var response = given().headers(getHeaders()).when().get("/api/v1/chat/mistral/models");
        Json.createReader(new StringReader(response.getBody().print())).readArray();
    }

    @Test
    void testUnsupportedModelSuggestions() {
        var response = given().headers(getHeaders()).when().get("/api/v1/chat/foobar/models");
        assertHttpError(response);
    }

}
