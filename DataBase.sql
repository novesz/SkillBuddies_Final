CREATE DATABASE  IF NOT EXISTS `skillmegoszt` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `skillmegoszt`;
-- MySQL dump 10.13  Distrib 8.0.38, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: skillmegoszt
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `changes`
--

DROP TABLE IF EXISTS `changes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `changes` (
  `ChangeID` int(11) NOT NULL AUTO_INCREMENT,
  `UserID` int(11) NOT NULL,
  `Username` varchar(45) NOT NULL,
  `Password` varchar(45) NOT NULL,
  `Email` varchar(45) NOT NULL,
  `rankID` int(11) NOT NULL,
  `ChangedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ChangeID`),
  KEY `fkUser` (`UserID`),
  CONSTRAINT `fkUser` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chats`
--

DROP TABLE IF EXISTS `chats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chats` (
  `ChatID` int(11) NOT NULL AUTO_INCREMENT,
  `PublicID` varchar(6) NOT NULL,
  `ChatName` varchar(45) NOT NULL,
  `ChatPic` int(11) DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `IsPrivate` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`ChatID`),
  UNIQUE KEY `PublicID_UNIQUE` (`PublicID`),
  KEY `PicFk_idx` (`ChatPic`),
  CONSTRAINT `fkPicture` FOREIGN KEY (`ChatPic`) REFERENCES `pictures` (`PicID`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `msgs`
--

DROP TABLE IF EXISTS `msgs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `msgs` (
  `MsgID` int(11) NOT NULL AUTO_INCREMENT,
  `UserID` int(11) NOT NULL,
  `ChatID` int(11) NOT NULL,
  `Content` text NOT NULL,
  `SentAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`MsgID`),
  KEY `fkUsers_idx` (`UserID`),
  KEY `fkChats_idx` (`ChatID`),
  CONSTRAINT `msgs_fk_chat` FOREIGN KEY (`ChatID`) REFERENCES `chats` (`ChatID`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `msgs_fk_user` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `neededskills`
--

DROP TABLE IF EXISTS `neededskills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `neededskills` (
  `ChatID` int(11) NOT NULL,
  `SkillID` int(11) NOT NULL,
  PRIMARY KEY (`ChatID`,`SkillID`),
  KEY `SkillID` (`SkillID`),
  CONSTRAINT `neededskills_ibfk_1` FOREIGN KEY (`ChatID`) REFERENCES `chats` (`ChatID`),
  CONSTRAINT `neededskills_ibfk_2` FOREIGN KEY (`SkillID`) REFERENCES `skills` (`SkillID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pictures`
--

DROP TABLE IF EXISTS `pictures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pictures` (
  `PicID` int(11) NOT NULL AUTO_INCREMENT,
  `URL` text NOT NULL,
  PRIMARY KEY (`PicID`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `Reviewer` int(11) NOT NULL,
  `Reviewee` int(11) NOT NULL,
  `Rating` int(1) DEFAULT NULL,
  `Content` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`Reviewer`,`Reviewee`),
  KEY `Reviewee` (`Reviewee`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`Reviewer`) REFERENCES `users` (`UserID`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`Reviewee`) REFERENCES `users` (`UserID`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `skills`
--

DROP TABLE IF EXISTS `skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skills` (
  `SkillID` int(11) NOT NULL AUTO_INCREMENT,
  `Skill` varchar(45) NOT NULL,
  PRIMARY KEY (`SkillID`),
  UNIQUE KEY `Skill` (`Skill`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `TicketID` int(11) NOT NULL AUTO_INCREMENT,
  `Email` varchar(50) DEFAULT NULL,
  `Text` varchar(45) NOT NULL,
  `IsResolved` tinyint(1) DEFAULT 0,
  `SentAt` date NOT NULL DEFAULT current_timestamp(),
  `Reply` text DEFAULT NULL,
  PRIMARY KEY (`TicketID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `uac`
--

DROP TABLE IF EXISTS `uac`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `uac` (
  `UserID` int(11) NOT NULL,
  `ChatID` int(11) NOT NULL,
  `IsChatAdmin` tinyint(1) NOT NULL DEFAULT 0,
  `JoinedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`UserID`,`ChatID`),
  KEY `cfk2_idx` (`ChatID`),
  CONSTRAINT `uac_fk_chat` FOREIGN KEY (`ChatID`) REFERENCES `chats` (`ChatID`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `uac_fk_user` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `uas`
--

DROP TABLE IF EXISTS `uas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `uas` (
  `UserID` int(11) NOT NULL,
  `SkillID` int(11) NOT NULL,
  PRIMARY KEY (`UserID`,`SkillID`),
  KEY `fk1_idx` (`SkillID`),
  CONSTRAINT `uas_fk_skill` FOREIGN KEY (`SkillID`) REFERENCES `skills` (`SkillID`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `uas_fk_user` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_rank`
--

DROP TABLE IF EXISTS `user_rank`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_rank` (
  `rankID` int(11) NOT NULL AUTO_INCREMENT,
  `which` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`rankID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `UserID` int(11) NOT NULL AUTO_INCREMENT,
  `Username` varchar(45) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `Email` varchar(45) NOT NULL,
  `PfpID` int(11) NOT NULL DEFAULT 1,
  `Tokens` int(11) NOT NULL DEFAULT 0,
  `rankID` int(11) NOT NULL DEFAULT 1,
  `JoinedAt` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `Email` (`Email`),
  KEY `fkRank_idx` (`rankID`),
  KEY `fkPic_idx` (`PfpID`),
  CONSTRAINT `fkRank` FOREIGN KEY (`rankID`) REFERENCES `user_rank` (`rankID`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER ChangeMade
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    DECLARE last_nonrank_change DATETIME;

    

    IF OLD.rankID <> NEW.rankID THEN
        INSERT INTO changes (UserID, Username, Password, Email, rankID)
        VALUES (OLD.UserID, OLD.Username, OLD.Password, OLD.Email, OLD.rankID);
    END IF;



    IF OLD.Username <> NEW.Username
       OR OLD.Password <> NEW.Password
       OR OLD.Email <> NEW.Email THEN

        -- Load last non-rank change timestamp
        SELECT MAX(ChangedAt)
        INTO last_nonrank_change
        FROM changes
        WHERE UserID = OLD.UserID
          AND rankID = OLD.rankID;  
        
        IF last_nonrank_change IS NOT NULL
           AND TIMESTAMPDIFF(HOUR, last_nonrank_change, NOW()) < 24 THEN

            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'You must wait 24 hours before changing your profile information again.';

        END IF;

       
        INSERT INTO changes (UserID, Username, Password, Email, rankID)
        VALUES (OLD.UserID, OLD.Username, OLD.Password, OLD.Email, OLD.rankID);

    END IF;

END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Dumping events for database 'skillmegoszt'
--

--
-- Dumping routines for database 'skillmegoszt'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-05 10:56:05
