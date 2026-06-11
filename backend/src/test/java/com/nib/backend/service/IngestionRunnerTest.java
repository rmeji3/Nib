package com.nib.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class IngestionRunnerTest {

    @Test
    void extractsResumeDocumentTypeFromSummary() {
        String docType = ReflectionTestUtils.invokeMethod(
                IngestionRunner.class,
                "extractDocType",
                """
                This document is a resume for Rafael Mejia.
                TYPE: Resume
                It lists education, experience, projects, and technical skills.
                """
        );

        assertThat(docType).isEqualTo("resume");
    }

    @Test
    void extractsCvDocumentTypeFromSummary() {
        String docType = ReflectionTestUtils.invokeMethod(
                IngestionRunner.class,
                "extractDocType",
                """
                This document is a curriculum vitae.
                TYPE: CV
                It lists academic and professional experience.
                """
        );

        assertThat(docType).isEqualTo("resume");
    }
}
