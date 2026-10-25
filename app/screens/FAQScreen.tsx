import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {pastelColors} from '../theme/colors';

const FAQ_ITEMS = [
  {
    question: 'Why do I need Google Sign-In?',
    answer: 'Google Sign-In helps us keep accounts secure and reduce spam while making sign-in faster.',
  },
  {
    question: 'Can I change my username?',
    answer: 'Yes, usernames can be updated if the new username is available.',
  },
  {
    question: 'How do I make my account private?',
    answer: 'Go to Profile -> Settings -> Private Account and enable it.',
  },
  {
    question: 'Are community posts anonymous?',
    answer: 'Yes. Posts and comments inside communities are anonymous.',
  },
  {
    question: 'Can people see my real profile in communities?',
    answer: 'No. Other users only see your anonymous alias within a thread.',
  },
  {
    question: 'Why does my anonymous name change between threads?',
    answer: 'To protect privacy, aliases are unique to each discussion thread.',
  },
  {
    question: "Why can't I post in a community?",
    answer: 'Some communities require approval before members can post.',
  },
  {
    question: 'What content is not allowed on Touch?',
    answer:
      'Content that violates our Community Guidelines, including harassment, hate speech, illegal content, or harmful behavior.',
  },
  {
    question: 'How do I report a post or user?',
    answer: 'Open the post or profile menu and tap Report.',
  },
  {
    question: 'Can other users see my email address?',
    answer: 'No. Your email address is never shown publicly.',
  },
  {
    question: 'How can I block someone?',
    answer: 'Visit their profile and choose the Block option.',
  },
  {
    question: 'How do I delete my account?',
    answer: 'Go to Settings -> Delete Account. Feedback is optional. Confirm your request; deletion is completed within 14 working days (Monday-Friday, excluding weekends).',
  },
  {
    question: 'What is Gopzo?',
    answer:
      "Gopzo is Touch's upcoming immersive content platform featuring interactive experiences created by selected creators.",
  },
  {
    question: 'Why does Gopzo say "Coming Soon"?',
    answer: 'Gopzo is currently under development and will be released in future updates.',
  },
  {
    question: "Why can't I upload many reels?",
    answer: 'Reel upload limits increase as you become a more active creator.',
  },
  {
    question: 'Is Touch free to use?',
    answer: 'Yes.',
  },
  {
    question: 'How do I contact the Touch team?',
    answer: 'Go to Settings -> Contact Us.',
  },
  {
    question: 'Where can I see upcoming features?',
    answer: 'Check the Gopzo section and our social media pages for updates.',
  },
];

export default function FAQScreen() {
  const navigation = useNavigation();
  const [openQuestion, setOpenQuestion] = useState(FAQ_ITEMS[0].question);

  return (
    <SafeAreaView testID="faq-screen" style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={pastelColors.auth.deepText} />
        </Pressable>
        <Text style={styles.title}>FAQ</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {FAQ_ITEMS.map(item => {
          const isOpen = openQuestion === item.question;
          return (
            <Pressable
              key={item.question}
              accessibilityRole="button"
              onPress={() => setOpenQuestion(isOpen ? '' : item.question)}
              style={styles.faqCard}>
              <View style={styles.questionRow}>
                <Text style={styles.question}>{item.question}</Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={pastelColors.auth.mutedText}
                />
              </View>
              {isOpen ? <Text style={styles.answer}>{item.answer}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: pastelColors.auth.background,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: pastelColors.auth.glassBorder,
    backgroundColor: pastelColors.auth.background,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pastelColors.white,
  },
  headerSpacer: {
    width: 42,
  },
  title: {
    color: pastelColors.auth.deepText,
    fontSize: 28,
    fontWeight: '900',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  faqCard: {
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: pastelColors.auth.glassBorder,
    backgroundColor: pastelColors.white,
    padding: 16,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  question: {
    flex: 1,
    color: pastelColors.auth.deepText,
    fontSize: 15,
    fontWeight: '900',
  },
  answer: {
    marginTop: 10,
    color: pastelColors.auth.mutedText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
