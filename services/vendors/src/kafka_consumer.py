"""Kafka configuration and consumer for Vendors service."""
import os
import json
import asyncio
from aiokafka import AIOKafkaConsumer
from sqlalchemy.orm import Session
from src.database import SessionLocal, Vendor as DBVendor

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_GROUP_ID = "vendors-service-group"

async def consume_vendor_registrations():
    """
    Consume vendor registration events from Kafka.
    Auto-creates vendor profiles when users register with role='vendor'.
    """
    consumer = AIOKafkaConsumer(
        "user.vendor.registered",
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id=KAFKA_GROUP_ID,
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        auto_offset_reset='earliest',
        enable_auto_commit=True
    )
    
    print(f"[Kafka] Starting vendor registration consumer...")
    
    try:
        await consumer.start()
        print(f"[Kafka] Connected to Kafka at {KAFKA_BOOTSTRAP_SERVERS}")
        print(f"[Kafka] Listening for vendor registration events on 'user.vendor.registered' topic")
        
        async for message in consumer:
            try:
                event_data = message.value
                user_id = str(event_data.get("user_id"))  # Convert to string for VARCHAR column
                email = event_data.get("email")
                
                if not user_id or not email:
                    print(f"[Kafka] ⚠️  Invalid event data: {event_data}")
                    continue
                
                print(f"[Kafka] 📧 Received vendor registration: user_id={user_id}, email={email}")
                
                # Create vendor profile in database
                db = SessionLocal()
                try:
                    # Check if vendor already exists
                    existing_vendor = db.query(DBVendor).filter(
                        (DBVendor.user_id == user_id) | (DBVendor.email == email)
                    ).first()
                    
                    if existing_vendor:
                        if existing_vendor.user_id is None and existing_vendor.email == email:
                            # Vendor was pre-created by organizer, link to user_id
                            existing_vendor.user_id = user_id
                            db.commit()
                            print(f"[Kafka] ✅ Linked existing vendor (id={existing_vendor.id}) to user_id={user_id}")
                        else:
                            print(f"[Kafka] ℹ️  Vendor already exists: {email}")
                    else:
                        # Create new vendor profile
                        new_vendor = DBVendor(
                            user_id=user_id,
                            email=email,
                            name=None,  # Vendor will update this later
                            phone=None
                        )
                        db.add(new_vendor)
                        db.commit()
                        db.refresh(new_vendor)
                        print(f"[Kafka] ✅ Auto-created vendor profile: id={new_vendor.id}, user_id={user_id}, email={email}")
                
                except Exception as db_error:
                    db.rollback()
                    print(f"[Kafka] ❌ Database error: {db_error}")
                finally:
                    db.close()
                    
            except Exception as e:
                print(f"[Kafka] ❌ Error processing message: {e}")
                continue
    
    except Exception as e:
        print(f"[Kafka] ❌ Consumer error: {e}")
    finally:
        await consumer.stop()
        print("[Kafka] Consumer stopped")

def start_kafka_consumer():
    """Start Kafka consumer in background task."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    asyncio.create_task(consume_vendor_registrations())
