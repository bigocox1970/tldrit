| schemaname | tablename | policyname                               | permissive | roles           | cmd    | qual                              | with_check             |
| ---------- | --------- | ---------------------------------------- | ---------- | --------------- | ------ | --------------------------------- | ---------------------- |
| public     | profiles  | Public profiles are viewable by everyone | PERMISSIVE | {public}        | SELECT | true                              | null                   |
| public     | profiles  | Users can update own profile             | PERMISSIVE | {public}        | UPDATE | (auth.uid() = id)                 | null                   |
| public     | profiles  | Users can view their own profile         | PERMISSIVE | {public}        | SELECT | (auth.uid() = id)                 | null                   |
| public     | profiles  | Users can update their own profile       | PERMISSIVE | {public}        | UPDATE | (auth.uid() = id)                 | null                   |
| public     | summaries | Users can view their own summaries       | PERMISSIVE | {public}        | SELECT | (auth.uid() = user_id)            | null                   |
| public     | summaries | Users can insert their own summaries     | PERMISSIVE | {public}        | INSERT | null                              | (auth.uid() = user_id) |
| public     | summaries | Users can update their own summaries     | PERMISSIVE | {public}        | UPDATE | (auth.uid() = user_id)            | null                   |
| public     | summaries | Users can delete their own summaries     | PERMISSIVE | {public}        | DELETE | (auth.uid() = user_id)            | null                   |
| public     | news      | Anyone can view news                     | PERMISSIVE | {authenticated} | SELECT | true                              | null                   |
| public     | interests | Anyone can view interests                | PERMISSIVE | {public}        | SELECT | true                              | null                   |
| public     | news      | Allow read access to news                | PERMISSIVE | {public}        | SELECT | true                              | null                   |
| public     | news      | Allow all inserts                        | PERMISSIVE | {public}        | INSERT | null                              | true                   |
| public     | news      | Allow all updates                        | PERMISSIVE | {public}        | UPDATE | true                              | null                   |
| public     | summaries | Allow anyone to read example summaries   | PERMISSIVE | {public}        | SELECT | (user_id = get_example_user_id()) | null                   |