-- Run this once to enable the "change password only every 24 hours" rule.
-- Adds a column to remember when the user last changed their password.

USE skillmegoszt;

ALTER TABLE users
ADD COLUMN LastPasswordChange DATETIME NULL DEFAULT NULL;

-- Existing users have NULL = no previous change, so they can change password once immediately.
