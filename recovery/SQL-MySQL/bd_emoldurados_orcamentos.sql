CREATE DATABASE  IF NOT EXISTS `bd_emoldurados` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `bd_emoldurados`;
-- MySQL dump 10.13  Distrib 8.0.36, for macos14 (x86_64)
--
-- Host: localhost    Database: bd_emoldurados
-- ------------------------------------------------------
-- Server version	8.0.42

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
-- Table structure for table `orcamentos`
--

DROP TABLE IF EXISTS `orcamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orcamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `largura` decimal(5,2) DEFAULT NULL,
  `altura` decimal(5,2) DEFAULT NULL,
  `tipo_emoldurado_id` int DEFAULT NULL,
  `moldura_id` int DEFAULT NULL,
  `vidro_id` int DEFAULT NULL,
  `fundo_id` int DEFAULT NULL,
  `passepartout_id` int DEFAULT NULL,
  `incluir_impressao` tinyint(1) DEFAULT '0',
  `valor_total` decimal(10,2) DEFAULT NULL,
  `data_orcamento` datetime DEFAULT CURRENT_TIMESTAMP,
  `num_aberturas` int DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `tipo_emoldurado_id` (`tipo_emoldurado_id`),
  KEY `moldura_id` (`moldura_id`),
  KEY `vidro_id` (`vidro_id`),
  KEY `fundo_id` (`fundo_id`),
  KEY `passepartout_id` (`passepartout_id`),
  CONSTRAINT `orcamentos_ibfk_1` FOREIGN KEY (`tipo_emoldurado_id`) REFERENCES `tipos_orcamento` (`id`),
  CONSTRAINT `orcamentos_ibfk_2` FOREIGN KEY (`moldura_id`) REFERENCES `molduras` (`id`),
  CONSTRAINT `orcamentos_ibfk_3` FOREIGN KEY (`vidro_id`) REFERENCES `vidros` (`id`),
  CONSTRAINT `orcamentos_ibfk_4` FOREIGN KEY (`fundo_id`) REFERENCES `fundos` (`id`),
  CONSTRAINT `orcamentos_ibfk_5` FOREIGN KEY (`passepartout_id`) REFERENCES `passepartouts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orcamentos`
--

LOCK TABLES `orcamentos` WRITE;
/*!40000 ALTER TABLE `orcamentos` DISABLE KEYS */;
/*!40000 ALTER TABLE `orcamentos` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-15 18:41:34
