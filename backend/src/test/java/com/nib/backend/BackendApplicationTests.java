package com.nib.backend;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BackendApplicationTests {

	@Test
	void applicationClassLoads() {
		assertThat(new BackendApplication()).isNotNull();
	}

}
