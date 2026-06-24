SET FOREIGN_KEY_CHECKS = 0;


CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `model_has_roles` (
  `role_id` bigint(20) unsigned NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`model_id`,`model_type`),
  KEY `model_has_roles_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_has_permissions` (
  `permission_id` bigint(20) unsigned NOT NULL,
  `role_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`role_id`),
  CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1. Tabel Partners
CREATE TABLE IF NOT EXISTS `partners` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('university', 'company', 'government', 'ngo', 'other') NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT '1',
  `address` TEXT NULL DEFAULT NULL,
  `email` VARCHAR(255) NULL DEFAULT NULL,
  `phone` VARCHAR(255) NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `partner_contacts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `position` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NULL DEFAULT NULL,
  `phone` VARCHAR(255) NULL DEFAULT NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT '0',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `partner_contacts_partner_id_foreign` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 2. Tabel Surveys
CREATE TABLE IF NOT EXISTS `surveys` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT '0',
  `created_by` BIGINT UNSIGNED NOT NULL,
  `employee_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3. Tabel Survey Questions
CREATE TABLE IF NOT EXISTS `survey_questions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_text` TEXT NOT NULL,
  `type` enum('essay','multiple_choice','rating','single_choice','short_answer') NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT '1',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 4. Tabel Survey Question Assignments
CREATE TABLE IF NOT EXISTS `survey_question_assignments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `survey_id` BIGINT UNSIGNED NOT NULL,
  `survey_question_id` BIGINT UNSIGNED NOT NULL,
  `order` INT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `survey_question_assignments_survey_id_foreign` (`survey_id` ASC),
  INDEX `survey_question_assignments_survey_question_id_foreign` (`survey_question_id` ASC),
  CONSTRAINT `survey_question_assignments_survey_id_foreign`
    FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_question_assignments_survey_question_id_foreign`
    FOREIGN KEY (`survey_question_id`) REFERENCES `survey_questions` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 5. Tabel Survey Question Options
CREATE TABLE IF NOT EXISTS `survey_question_options` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `survey_question_id` BIGINT UNSIGNED NOT NULL,
  `option_text` VARCHAR(255) NOT NULL,
  `weight` DECIMAL(5,2) NOT NULL DEFAULT '0.00',
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `survey_question_options_survey_question_id_foreign` (`survey_question_id` ASC),
  CONSTRAINT `survey_question_options_survey_question_id_foreign`
    FOREIGN KEY (`survey_question_id`) REFERENCES `survey_questions` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 6. Tabel Survey Invitations
CREATE TABLE IF NOT EXISTS `survey_invitations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `survey_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NULL DEFAULT NULL,
  `email` VARCHAR(255) NULL DEFAULT NULL,
  `phone` VARCHAR(255) NULL DEFAULT NULL,
  `pin` VARCHAR(255) NOT NULL,
  `is_used` TINYINT(1) NOT NULL DEFAULT '0',
  `used_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `survey_invitations_pin_unique` (`pin` ASC),
  INDEX `survey_invitations_survey_id_foreign` (`survey_id` ASC),
  CONSTRAINT `survey_invitations_survey_id_foreign`
    FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 7. Tabel Survey Responses
CREATE TABLE IF NOT EXISTS `survey_responses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `survey_id` BIGINT UNSIGNED NOT NULL,
  `survey_invitation_id` BIGINT UNSIGNED NOT NULL,
  `submitted_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `survey_responses_survey_id_foreign` (`survey_id` ASC),
  INDEX `survey_responses_survey_invitation_id_foreign` (`survey_invitation_id` ASC),
  CONSTRAINT `survey_responses_survey_id_foreign`
    FOREIGN KEY (`survey_id`) REFERENCES `surveys` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_responses_survey_invitation_id_foreign`
    FOREIGN KEY (`survey_invitation_id`) REFERENCES `survey_invitations` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 8. Tabel Survey Answers
CREATE TABLE IF NOT EXISTS `survey_answers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `survey_response_id` BIGINT UNSIGNED NOT NULL,
  `survey_question_id` BIGINT UNSIGNED NOT NULL,
  `answer_text` TEXT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `survey_answers_survey_response_id_foreign` (`survey_response_id` ASC),
  INDEX `survey_answers_survey_question_id_foreign` (`survey_question_id` ASC),
  CONSTRAINT `survey_answers_survey_question_id_foreign`
    FOREIGN KEY (`survey_question_id`) REFERENCES `survey_questions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_answers_survey_response_id_foreign`
    FOREIGN KEY (`survey_response_id`) REFERENCES `survey_responses` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 9. Tabel Survey Answer Options
CREATE TABLE IF NOT EXISTS `survey_answer_options` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `survey_answer_id` BIGINT UNSIGNED NOT NULL,
  `survey_question_option_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `survey_answer_options_survey_answer_id_foreign` (`survey_answer_id` ASC),
  INDEX `survey_answer_options_survey_question_option_id_foreign` (`survey_question_option_id` ASC),
  CONSTRAINT `survey_answer_options_survey_answer_id_foreign`
    FOREIGN KEY (`survey_answer_id`) REFERENCES `survey_answers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `survey_answer_options_survey_question_option_id_foreign`
    FOREIGN KEY (`survey_question_option_id`) REFERENCES `survey_question_options` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `partner_id` BIGINT UNSIGNED,
  `action` VARCHAR(255),
  PRIMARY KEY (`id`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`partner_id`) REFERENCES `partners` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Fix Enums in production
ALTER TABLE survey_questions MODIFY COLUMN type ENUM('essay', 'multiple_choice', 'rating', 'single_choice', 'short_answer') NOT NULL;
ALTER TABLE partners MODIFY COLUMN type ENUM('university', 'company', 'government', 'ngo', 'other', '') NOT NULL;
