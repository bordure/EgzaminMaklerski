from ingestion import Ingestion
import os 
import json 

def main(mode, is_inserting):
    ingestion = Ingestion(mode, is_inserting)
    if is_inserting:
        print("Before drop:", ingestion.db.list_collection_names())
        ingestion.collection.drop()
        print("After drop:", ingestion.db.list_collection_names())
    dir = "data/"
    for root, dirs, files in os.walk(dir):
        for file in files:
            if file.lower().endswith(".json"):
                with open(os.path.join(dir, file), "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for question in data:
                        question.pop("id", None)
                        question.pop("_id", None)
                        main_topic, sub_topic = ingestion.get_main_and_sub_topic(question["question"])
                        question["main_topic"] = main_topic
                        question["sub_topic"] = sub_topic
                    ingestion.safe_insert_many(data)
if __name__ == "__main__":
    main("prod", True)
