import type { IndicatorRequest } from "@/types/indicator";
import { API_BASE_URL, ENDPOINTS } from "./api/config";

export const LANGUAGES = ["cURL", "JavaScript", "Python", "Go", "PHP"] as const;
export type Language = (typeof LANGUAGES)[number];

const KEY_PLACEHOLDER = "YOUR_API_KEY";

function endpoint(): string {
  return `${API_BASE_URL || "https://api.your-host.com"}${ENDPOINTS.calculate}`;
}

/** Builds runnable snippets from the live request object — never from canned text. */
export function generateCode(language: Language, request: IndicatorRequest): string {
  const url = endpoint();
  const body = JSON.stringify(request, null, 2);

  switch (language) {
    case "cURL":
      return `curl -s ${url} \\
  -H 'content-type: application/json' \\
  -H 'authorization: Bearer ${KEY_PLACEHOLDER}' \\
  -d '${body}'`;

    case "JavaScript":
      return `const response = await fetch("${url}", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: \`Bearer \${process.env.INDICATOR_API_KEY}\`,
  },
  body: JSON.stringify(${body.replace(/\n/g, "\n  ")}),
});

if (!response.ok) throw new Error(\`Request failed: \${response.status}\`);
const data = await response.json();
console.log(data.results);`;

    case "Python":
      return `import os
import requests

payload = ${body.replace(/\btrue\b/g, "True").replace(/\bfalse\b/g, "False").replace(/\bnull\b/g, "None")}

response = requests.post(
    "${url}",
    json=payload,
    headers={"authorization": f"Bearer {os.environ['INDICATOR_API_KEY']}"},
    timeout=30,
)
response.raise_for_status()
print(response.json()["results"])`;

    case "Go":
      return `package main

import (
\t"bytes"
\t"fmt"
\t"io"
\t"net/http"
\t"os"
)

func main() {
\tpayload := []byte(\`${body}\`)

\treq, _ := http.NewRequest("POST", "${url}", bytes.NewBuffer(payload))
\treq.Header.Set("content-type", "application/json")
\treq.Header.Set("authorization", "Bearer "+os.Getenv("INDICATOR_API_KEY"))

\tres, err := http.DefaultClient.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer res.Body.Close()

\tout, _ := io.ReadAll(res.Body)
\tfmt.Println(string(out))
}`;

    case "PHP":
      return `<?php
$payload = <<<'JSON'
${body}
JSON;

$ch = curl_init("${url}");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        "content-type: application/json",
        "authorization: Bearer " . getenv("INDICATOR_API_KEY"),
    ],
]);

$response = curl_exec($ch);
curl_close($ch);
echo $response;`;
  }
}

export function languageId(language: Language): string {
  switch (language) {
    case "cURL":
      return "bash";
    case "JavaScript":
      return "javascript";
    case "Python":
      return "python";
    case "Go":
      return "go";
    case "PHP":
      return "php";
  }
}
