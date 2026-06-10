package com.nib.backend.service;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Component
public class PromptInjectionGuard {

    private static final List<Detector> DETECTORS = List.of(
            new Detector("ignore-instructions", Pattern.compile("\\b(ignore|disregard|forget)\\s+(all\\s+)?(previous|prior|above|system|developer)\\s+instructions?\\b")),
            new Detector("role-hijack", Pattern.compile("\\b(you\\s+are\\s+now|act\\s+as|pretend\\s+to\\s+be|roleplay\\s+as)\\b")),
            new Detector("system-prompt-exfiltration", Pattern.compile("\\b(reveal|print|show|expose|dump)\\s+(the\\s+)?(system|developer|hidden)\\s+(prompt|instructions|message)\\b")),
            new Detector("policy-override", Pattern.compile("\\b(system|developer)\\s+message\\s*[:=]|\\bnew\\s+(system|developer)\\s+instructions?\\b")),
            new Detector("safety-bypass", Pattern.compile("\\b(jailbreak|bypass\\s+(safety|policy|guardrails)|do\\s+not\\s+follow\\s+(safety|policy))\\b")),
            new Detector("tool-abuse", Pattern.compile("\\b(call|invoke|run|execute)\\s+(a\\s+)?(tool|function|command|shell|api)\\b")),
            new Detector("citation-bypass", Pattern.compile("\\b(do\\s+not\\s+cite|omit\\s+citations|make\\s+up\\s+citations|answer\\s+without\\s+citations)\\b"))
    );

    public Assessment assess(String sourceText) {
        if (sourceText == null || sourceText.isBlank()) {
            return new Assessment(false, List.of());
        }

        String normalized = normalize(sourceText);
        List<String> matches = new ArrayList<>();
        for (Detector detector : DETECTORS) {
            if (detector.pattern().matcher(normalized).find()) {
                matches.add(detector.name());
            }
        }

        return new Assessment(!matches.isEmpty(), List.copyOf(matches));
    }

    private String normalize(String sourceText) {
        return sourceText
                .replaceAll("[\\p{Cntrl}&&[^\n\t]]", " ")
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private record Detector(String name, Pattern pattern) {}

    public record Assessment(boolean suspicious, List<String> reasons) {}
}
