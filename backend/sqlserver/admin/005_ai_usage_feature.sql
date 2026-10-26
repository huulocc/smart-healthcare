-- SQL Server 2019+. Additive migration for AI usage feature column
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH('dbo.ai_usage_events', 'feature') IS NULL
    BEGIN
        ALTER TABLE dbo.ai_usage_events ADD feature varchar(50) NOT NULL CONSTRAINT df_ai_usage_feature DEFAULT 'CHAT';
        CREATE INDEX ix_ai_usage_feature ON dbo.ai_usage_events(feature, timestamp DESC);
    END

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
