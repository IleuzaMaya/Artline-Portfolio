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
-- Table structure for table `tipos_orcamento`
--

DROP TABLE IF EXISTS `tipos_orcamento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipos_orcamento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(50) NOT NULL,
  `permite_passepartout` tinyint(1) DEFAULT '0',
  `permite_fundo` tinyint(1) DEFAULT '0',
  `permite_vidro_comum` tinyint(1) DEFAULT '0',
  `permite_vidro_antirreflexo` tinyint(1) DEFAULT '0',
  `moldura_restrita` tinyint(1) DEFAULT '0',
  `observacoes` text,
  `ativo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipos_orcamento`
--

LOCK TABLES `tipos_orcamento` WRITE;
/*!40000 ALTER TABLE `tipos_orcamento` DISABLE KEYS */;
INSERT INTO `tipos_orcamento` VALUES (1,'Superfície',1,1,1,1,1,'Pode ser feito com qualquer moldura, menos canaleta',1),(2,'Fotos',1,1,1,1,1,'Pode ser feito com qualquer moldura, menos canaleta. Quantidade de aberturas no passpartout',1),(3,'Entre vidros',0,0,1,1,1,'Vidro frente e verso, sem fundo. Sem passepartout',1),(4,'Profundidade',1,1,1,0,1,'Somente moldura caixa. Antirreflexo deixa trabalho opaco',1),(5,'Flutuante',1,1,1,0,1,'Somente moldura caixa. Antirreflexo deixa trabalho opaco. Margem em torno da gravura',1),(6,'Camisa/Objeto',1,1,1,0,1,'Somente moldura caixa. Antirreflexo deixa trabalho opaco. Valor extra pela fixação',1),(7,'Tela',0,0,0,0,1,'Não leva vidro.',1),(8,'Diversos',0,0,0,0,0,NULL,1);
/*!40000 ALTER TABLE `tipos_orcamento` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-15 18:41:33
