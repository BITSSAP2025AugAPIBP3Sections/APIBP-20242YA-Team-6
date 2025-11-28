import asyncio
import json
import os
from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaError

class KafkaProducerService:
    def __init__(self):
        self.producer = None
        self.kafka_bootstrap_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'kafka:9092')
    
    async def start(self):
        """Initialize and start the Kafka producer"""
        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=self.kafka_bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            await self.producer.start()
            print(f"✅ Kafka producer connected to {self.kafka_bootstrap_servers}")
        except KafkaError as e:
            print(f"⚠️ Failed to connect to Kafka: {e}")
            # Don't raise exception to allow service to continue without Kafka
    
    async def stop(self):
        """Stop the Kafka producer"""
        if self.producer:
            await self.producer.stop()
            print("✅ Kafka producer stopped")
    
    async def publish_vendor_registration(self, user_id: int, email: str):
        """
        Publish vendor registration event to Kafka.
        Topic: user.vendor.registered
        Payload: {"user_id": int, "email": str}
        """
        if not self.producer:
            print(f"⚠️ Kafka producer not available, skipping vendor registration event for {email}")
            return
        
        try:
            event_data = {
                "user_id": user_id,
                "email": email
            }
            await self.producer.send_and_wait(
                topic="user.vendor.registered",
                value=event_data
            )
            print(f"✅ Published vendor registration event: user_id={user_id}, email={email}")
        except Exception as e:
            print(f"⚠️ Failed to publish vendor registration event: {e}")

# Global instance
kafka_producer = KafkaProducerService()

async def get_kafka_producer():
    """Dependency to get the Kafka producer instance"""
    return kafka_producer
